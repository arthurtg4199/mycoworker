import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type {
  Database,
  WhatsAppIngestResult,
  WhatsAppReplyContext,
  WhatsAppTokenSource,
} from "@/lib/db/types";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { hashWebhookToken } from "@/lib/whatsapp/crypto";
import { readWhatsAppConfig } from "@/lib/whatsapp/env";

export type WhatsAppConnectionView = {
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  businessName: string | null;
  wabaId: string | null;
  tokenSource: WhatsAppTokenSource;
  autoReply: boolean;
  status: "connected" | "disconnected";
};

const publicColumns =
  "phone_number_id, display_phone_number, business_name, waba_id, token_source, auto_reply, status";

function anonClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createSupabaseClient<Database>(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function isTokenSource(value: string): value is WhatsAppTokenSource {
  return value === "pasted" || value === "oauth" || value === "env";
}

function viewFromRow(row: {
  phone_number_id: string;
  display_phone_number: string | null;
  business_name: string | null;
  waba_id: string | null;
  token_source: string;
  auto_reply: boolean;
  status: string;
}): WhatsAppConnectionView | null {
  if (!isTokenSource(row.token_source)) return null;
  if (row.status !== "connected" && row.status !== "disconnected") return null;
  return {
    phoneNumberId: row.phone_number_id,
    displayPhoneNumber: row.display_phone_number,
    businessName: row.business_name,
    wabaId: row.waba_id,
    tokenSource: row.token_source,
    autoReply: row.auto_reply,
    status: row.status,
  };
}

export const getWhatsAppConnection = cache(
  async (): Promise<WhatsAppConnectionView | null> => {
    if (!getSupabaseEnv()) return null;
    try {
      const db = await createClient();
      const { data, error } = await db
        .from("whatsapp_connections")
        .select(publicColumns)
        .limit(1);
      if (error || !data?.[0]) return null;
      const view = viewFromRow(data[0]);
      if (!view || view.status !== "connected") return null;
      return view;
    } catch {
      return null;
    }
  },
);

/** Keep the saved webhook hash aligned with WEBHOOK_VERIFY_TOKEN. */
export async function syncIngestHash() {
  const config = await readWhatsAppConfig();
  if (!config.webhookReady || !getSupabaseEnv()) return;
  try {
    const db = await createClient();
    await db
      .from("whatsapp_connections")
      .update({ ingest_token_hash: hashWebhookToken(config.verifyToken) })
      .eq("status", "connected");
  } catch {
    // Connecting still works. Inbound saves wait until this hash lands.
  }
}

export type SavedConnectionInput = {
  userId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  wabaId: string | null;
  businessName: string | null;
  accessToken: string | null;
  tokenSource: WhatsAppTokenSource;
  keepAutoReply: boolean;
};

export async function saveWhatsAppConnection(input: SavedConnectionInput) {
  const config = await readWhatsAppConfig();
  const db = await createClient();
  const { data: existing, error: readError } = await db
    .from("whatsapp_connections")
    .select("auto_reply")
    .limit(1);
  if (readError) {
    if (readError.code === "PGRST205" || readError.code === "42P01") {
      return {
        ok: false as const,
        message:
          "The WhatsApp tables are not in the database yet. Apply the latest Supabase migration, then try again.",
      };
    }
    return { ok: false as const, message: "WhatsApp could not be saved. Try again." };
  }

  const autoReply = input.keepAutoReply
    ? Boolean(existing?.[0]?.auto_reply)
    : false;
  const row = {
    user_id: input.userId,
    phone_number_id: input.phoneNumberId,
    display_phone_number: input.displayPhoneNumber,
    waba_id: input.wabaId,
    business_name: input.businessName,
    access_token: input.tokenSource === "env" ? null : input.accessToken,
    token_source: input.tokenSource,
    ingest_token_hash: config.webhookReady
      ? hashWebhookToken(config.verifyToken)
      : null,
    auto_reply: autoReply,
    status: "connected" as const,
  };

  const { error } = existing?.[0]
    ? await db.from("whatsapp_connections").update(row).eq("user_id", input.userId)
    : await db.from("whatsapp_connections").insert(row);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false as const,
        message: "That WhatsApp number is already linked to an account.",
      };
    }
    if (error.code === "PGRST205" || error.code === "42P01") {
      return {
        ok: false as const,
        message:
          "The WhatsApp tables are not in the database yet. Apply the latest Supabase migration, then try again.",
      };
    }
    return { ok: false as const, message: "WhatsApp could not be saved. Try again." };
  }
  return { ok: true as const };
}

export async function disconnectWhatsAppConnection(userId: string) {
  const db = await createClient();
  const { error } = await db
    .from("whatsapp_connections")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false as const, message: "WhatsApp could not be disconnected." };
  return { ok: true as const };
}

export async function setWhatsAppAutoReplyEnabled(enabled: boolean) {
  const db = await createClient();
  const { data, error } = await db
    .from("whatsapp_connections")
    .update({ auto_reply: enabled })
    .eq("status", "connected")
    .select("phone_number_id");
  if (error || !data?.[0]) {
    return { ok: false as const, message: "Connect WhatsApp before changing replies." };
  }
  return { ok: true as const };
}

function ingestFromUnknown(value: unknown): WhatsAppIngestResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as WhatsAppIngestResult;
  if (typeof row.stored !== "boolean") return null;
  return row;
}

export async function ingestWhatsAppMessage(input: {
  verifyToken: string;
  phoneNumberId: string;
  waMessageId: string;
  from: string;
  profileName: string;
  body: string;
  hot: boolean;
}) {
  const db = anonClient();
  if (!db) return { ok: false as const, reason: "no_database" as const };
  const { data, error } = await db.rpc("mcw_ingest_whatsapp", {
    p_verify_token: input.verifyToken,
    p_phone_number_id: input.phoneNumberId,
    p_wa_message_id: input.waMessageId,
    p_from_phone: input.from,
    p_profile_name: input.profileName,
    p_body: input.body,
    p_hot: input.hot,
  });
  if (error) return { ok: false as const, reason: "query" as const };
  const parsed = ingestFromUnknown(data);
  if (!parsed) return { ok: false as const, reason: "query" as const };
  return { ok: true as const, result: parsed };
}

export async function recordWhatsAppAutoReply(input: {
  verifyToken: string;
  chatId: string;
  content: string;
  status: "answered" | "hot";
}) {
  const db = anonClient();
  if (!db) return false;
  const { data, error } = await db.rpc("mcw_record_whatsapp_outbound", {
    p_verify_token: input.verifyToken,
    p_chat_id: input.chatId,
    p_content: input.content,
    p_status: input.status,
  });
  if (error || !data || typeof data !== "object") return false;
  return Boolean((data as { stored?: boolean }).stored);
}

export async function whatsAppReplyContext(
  chatId: string,
): Promise<WhatsAppReplyContext | null> {
  const db = await createClient();
  const { data, error } = await db.rpc("mcw_whatsapp_reply_context", {
    p_chat_id: chatId,
  });
  if (error || !data?.[0]) return null;
  return data[0];
}

export async function resolveSendToken(context: {
  token_source: string;
  access_token: string | null;
  phone_number_id: string;
}) {
  if (context.token_source === "env") {
    const config = await readWhatsAppConfig();
    if (
      config.accessToken &&
      config.phoneNumberId === context.phone_number_id
    ) {
      return config.accessToken;
    }
    return null;
  }
  return context.access_token;
}
