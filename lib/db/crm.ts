import { cache } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  demoCustomerDetail,
  demoCustomerList,
  formatMoney,
  formatWhen,
  lastMessageLabel,
  paymentStatusLabel,
  stageFromUnknown,
  whoLabel,
  type CrmDetail,
  type CrmListItem,
  type CrmMessage,
  type CrmMode,
  type CrmPayment,
} from "@/lib/crm";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
  loadWorkspace,
} from "@/lib/db/queries";
import type { Channel, PaymentStatus } from "@/lib/db/types";
import { assertId, customerCrmUpdate } from "@/lib/db/validate";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type CustomerFields = {
  id: string;
  name: string;
  channel: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  stage?: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmListResult = {
  mode: CrmMode | "unavailable";
  notice: string | null;
  stageReady: boolean;
  customers: CrmListItem[];
};

export type CrmCustomerResult =
  | {
      kind: "ready";
      mode: CrmMode;
      notice: string | null;
      stageReady: boolean;
      customer: CrmDetail;
    }
  | { kind: "missing" }
  | { kind: "unavailable"; notice: string };

export type CrmSaveResult =
  | { ok: true; stageReady: boolean }
  | { ok: false; message: string };

function isMissingStageColumn(error: PostgrestError) {
  if (error.code !== "42703" && error.code !== "PGRST204") return false;
  return /stage/i.test(error.message);
}

function asChannel(value: string): Channel | null {
  if (value === "whatsapp" || value === "instagram" || value === "email") {
    return value;
  }
  return null;
}

function asPaymentStatus(value: string): PaymentStatus {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "failed" ||
    value === "refunded"
  ) {
    return value;
  }
  return "pending";
}

function listItemFrom(row: CustomerFields, lastMessageAt: string | null, now: Date): CrmListItem {
  return {
    id: row.id,
    name: row.name.trim() || "Customer",
    phone: row.phone,
    email: row.email,
    channel: asChannel(row.channel),
    stage: stageFromUnknown(row.stage),
    notes: row.notes ?? "",
    lastMessageLabel: lastMessageLabel(lastMessageAt, now),
  };
}

async function database() {
  if (!getSupabaseEnv()) throw new DatabaseNotConfiguredError();
  return createClient();
}

async function boardMode(): Promise<
  | { mode: "demo" }
  | { mode: "sample" }
  | { mode: "unavailable"; notice: string }
  | { mode: "live" }
> {
  if (!getSupabaseEnv()) return { mode: "demo" };
  const workspace = await loadWorkspace();
  if (workspace.source !== "live") return { mode: "sample" };
  if (workspace.notice) {
    return {
      mode: "unavailable",
      notice: "I could not open your customers yet. Refresh in a moment.",
    };
  }
  return { mode: "live" };
}

async function selectCustomers(
  db: Awaited<ReturnType<typeof database>>,
  customerId?: string,
) {
  const withStageQuery = db
    .from("customers")
    .select("id, name, channel, phone, email, notes, stage, created_at, updated_at");
  const withStage = await (customerId
    ? withStageQuery.eq("id", customerId)
    : withStageQuery);
  if (!withStage.error) {
    return { rows: withStage.data ?? [], stageReady: true };
  }
  if (!isMissingStageColumn(withStage.error)) {
    throw new DatabaseQueryError(withStage.error.message, withStage.error.code);
  }
  const plainQuery = db
    .from("customers")
    .select("id, name, channel, phone, email, notes, created_at, updated_at");
  const plain = await (customerId ? plainQuery.eq("id", customerId) : plainQuery);
  if (plain.error) {
    throw new DatabaseQueryError(plain.error.message, plain.error.code);
  }
  return {
    rows: (plain.data ?? []) as CustomerFields[],
    stageReady: false,
  };
}

async function liveCustomers(now: Date) {
  const db = await database();
  const [customers, chats] = await Promise.all([
    selectCustomers(db),
    db.from("chats").select("customer_id, last_message_at"),
  ]);
  if (chats.error) {
    throw new DatabaseQueryError(chats.error.message, chats.error.code);
  }
  const latest = new Map<string, string>();
  for (const chat of chats.data ?? []) {
    if (!chat.last_message_at) continue;
    const prev = latest.get(chat.customer_id);
    if (!prev || Date.parse(chat.last_message_at) > Date.parse(prev)) {
      latest.set(chat.customer_id, chat.last_message_at);
    }
  }
  const items = customers.rows
    .map((row) => listItemFrom(row, latest.get(row.id) ?? null, now))
    .sort((a, b) => {
      const aTime = Date.parse(latest.get(a.id) ?? "");
      const bTime = Date.parse(latest.get(b.id) ?? "");
      const aValue = Number.isNaN(aTime) ? 0 : aTime;
      const bValue = Number.isNaN(bTime) ? 0 : bTime;
      if (aValue !== bValue) return bValue - aValue;
      return a.name.localeCompare(b.name);
    });
  return { stageReady: customers.stageReady, customers: items };
}

const stageNotice =
  "Stages stick after you apply the latest database migration. Notes still save.";

export const loadCrmList = cache(async (): Promise<CrmListResult> => {
  const mode = await boardMode();
  if (mode.mode === "demo" || mode.mode === "sample") {
    return {
      mode: mode.mode,
      notice: null,
      stageReady: true,
      customers: demoCustomerList(),
    };
  }
  if (mode.mode === "unavailable") {
    return {
      mode: "unavailable",
      notice: mode.notice,
      stageReady: false,
      customers: [],
    };
  }
  try {
    const live = await liveCustomers(new Date());
    return {
      mode: "live",
      notice: live.stageReady ? null : stageNotice,
      stageReady: live.stageReady,
      customers: live.customers,
    };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return {
        mode: "demo",
        notice: null,
        stageReady: true,
        customers: demoCustomerList(),
      };
    }
    console.error(
      "MyCoWorker could not load customers.",
      error instanceof Error ? error.message : error,
    );
    return {
      mode: "unavailable",
      notice: "I could not open your customers yet. Refresh in a moment.",
      stageReady: false,
      customers: [],
    };
  }
});

async function liveDetail(id: string, now: Date): Promise<CrmCustomerResult> {
  let customerId: string;
  try {
    customerId = assertId(id, "Customer");
  } catch {
    return { kind: "missing" };
  }
  const db = await database();
  const [customers, chats, payments] = await Promise.all([
    selectCustomers(db, customerId),
    db
      .from("chats")
      .select("id, customer_id, channel, last_message_at")
      .eq("customer_id", customerId),
    db
      .from("payments")
      .select("id, customer_id, amount, currency, status, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  if (chats.error) throw new DatabaseQueryError(chats.error.message, chats.error.code);
  if (payments.error) {
    throw new DatabaseQueryError(payments.error.message, payments.error.code);
  }
  const row = customers.rows.find((item) => item.id === customerId);
  if (!row) return { kind: "missing" };

  const ownChats = (chats.data ?? []).filter((chat) => chat.customer_id === customerId);
  let lastMessageAt: string | null = null;
  for (const chat of ownChats) {
    if (!chat.last_message_at) continue;
    if (!lastMessageAt || Date.parse(chat.last_message_at) > Date.parse(lastMessageAt)) {
      lastMessageAt = chat.last_message_at;
    }
  }
  const chatIds = ownChats.map((chat) => chat.id);
  let messages: CrmMessage[] = [];
  if (chatIds.length > 0) {
    const messageQuery = await db
      .from("messages")
      .select("id, role, content, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false })
      .limit(12);
    if (messageQuery.error) {
      throw new DatabaseQueryError(messageQuery.error.message, messageQuery.error.code);
    }
    messages = (messageQuery.data ?? []).map((message) => ({
      id: message.id,
      who: whoLabel(message.role),
      content: message.content,
      when: formatWhen(message.created_at, now) || "Just now",
    }));
  }

  const paymentViews: CrmPayment[] = (payments.data ?? []).map((payment) => {
    const amount = typeof payment.amount === "number" ? payment.amount : Number(payment.amount);
    return {
      id: payment.id,
      amountLabel: formatMoney(Number.isFinite(amount) ? amount : 0, payment.currency),
      statusLabel: paymentStatusLabel(asPaymentStatus(payment.status)),
      when: formatWhen(payment.created_at, now),
    };
  });

  const customer: CrmDetail = {
    ...listItemFrom(row, lastMessageAt, now),
    messages,
    payments: paymentViews,
  };
  return {
    kind: "ready",
    mode: "live",
    notice: customers.stageReady ? null : stageNotice,
    stageReady: customers.stageReady,
    customer,
  };
}

export const loadCrmCustomer = cache(async (id: string): Promise<CrmCustomerResult> => {
  const clean = id.trim();
  if (!clean || clean.length > 80) return { kind: "missing" };
  const mode = await boardMode();
  if (mode.mode === "demo" || mode.mode === "sample") {
    const customer = demoCustomerDetail(clean);
    if (!customer) return { kind: "missing" };
    return {
      kind: "ready",
      mode: mode.mode,
      notice: null,
      stageReady: true,
      customer,
    };
  }
  if (mode.mode === "unavailable") {
    return { kind: "unavailable", notice: mode.notice };
  }
  try {
    return await liveDetail(clean, new Date());
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      const customer = demoCustomerDetail(clean);
      if (!customer) return { kind: "missing" };
      return {
        kind: "ready",
        mode: "demo",
        notice: null,
        stageReady: true,
        customer,
      };
    }
    console.error(
      "MyCoWorker could not open that customer.",
      error instanceof Error ? error.message : error,
    );
    return {
      kind: "unavailable",
      notice: "I could not open that customer yet. Refresh in a moment.",
    };
  }
});

export async function saveCustomerCrm(
  id: string,
  input: { stage: string; notes: string },
): Promise<CrmSaveResult> {
  const saved = customerCrmUpdate(input);
  const db = await database();
  const updated = await db
    .from("customers")
    .update(saved)
    .eq("id", assertId(id, "Customer"))
    .select("id")
    .maybeSingle();
  if (!updated.error) {
    if (!updated.data) return { ok: false, message: "That customer is not on your list." };
    return { ok: true, stageReady: true };
  }
  if (!isMissingStageColumn(updated.error)) {
    throw new DatabaseQueryError(updated.error.message, updated.error.code);
  }
  const notesOnly = await db
    .from("customers")
    .update({ notes: saved.notes })
    .eq("id", assertId(id, "Customer"))
    .select("id")
    .maybeSingle();
  if (notesOnly.error) {
    throw new DatabaseQueryError(notesOnly.error.message, notesOnly.error.code);
  }
  if (!notesOnly.data) return { ok: false, message: "That customer is not on your list." };
  return { ok: true, stageReady: false };
}
