"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import {
  createMessage,
  listMessages,
  updateConversation,
} from "@/lib/db/queries";
import type { ConversationStatus, Message } from "@/lib/db/types";
import { assertId } from "@/lib/db/validate";
import { siteOrigin } from "@/lib/http/origin";
import { readWhatsAppConfig } from "@/lib/whatsapp/env";
import {
  fetchPhoneNumber,
  oauthDialogUrl,
  sendWhatsAppText,
} from "@/lib/whatsapp/graph";
import {
  disconnectWhatsAppConnection,
  resolveSendToken,
  saveWhatsAppConnection,
  setWhatsAppAutoReplyEnabled,
  whatsAppReplyContext,
} from "@/lib/whatsapp/store";

export type WhatsAppFormState = { message?: string };

const OAUTH_COOKIE = "mcw_wa_oauth";

function refreshInbox() {
  revalidatePath("/");
  revalidatePath("/buyers");
  revalidatePath("/analytics");
  revalidatePath("/assistant");
  revalidatePath("/settings");
}

function cleanPhoneNumberId(value: string) {
  const id = value.trim();
  if (!/^[0-9]{6,32}$/.test(id)) return null;
  return id;
}

function cleanToken(value: string) {
  const token = value.trim();
  if (token.length < 20 || token.length > 4096 || /\s/.test(token)) return null;
  return token;
}

async function requireUser(): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>> } | { message: string }
> {
  const user = await getAuthUser();
  if (!user) return { message: "Sign in first." };
  return { user };
}

export async function connectWhatsAppWithToken(
  _previous: WhatsAppFormState,
  formData: FormData,
): Promise<WhatsAppFormState> {
  const auth = await requireUser();
  if ("message" in auth) return { message: auth.message };

  const phoneNumberId = cleanPhoneNumberId(
    String(formData.get("phoneNumberId") ?? ""),
  );
  const accessToken = cleanToken(String(formData.get("accessToken") ?? ""));
  if (!phoneNumberId || !accessToken) {
    return { message: "Enter the phone number ID and a Cloud API token." };
  }

  let failure: string | null = null;
  try {
    const phone = await fetchPhoneNumber(phoneNumberId, accessToken);
    if (!phone) {
      failure = "Meta did not accept that phone number ID and token.";
    } else {
      const saved = await saveWhatsAppConnection({
        userId: auth.user.id,
        phoneNumberId: phone.id,
        displayPhoneNumber: phone.displayPhoneNumber,
        wabaId: null,
        businessName: phone.verifiedName,
        accessToken,
        tokenSource: "pasted",
        keepAutoReply: true,
      });
      if (!saved.ok) failure = saved.message;
    }
  } catch {
    failure = "Meta could not be reached. Try again in a moment.";
  }
  if (failure) return { message: failure };

  refreshInbox();
  redirect("/settings?whatsapp=connected");
}

export async function connectWhatsAppFromEnv(
  previous: WhatsAppFormState,
  formData: FormData,
): Promise<WhatsAppFormState> {
  void previous;
  void formData;
  const auth = await requireUser();
  if ("message" in auth) return { message: auth.message };

  const config = await readWhatsAppConfig();
  if (!config.serverNumberReady) {
    return {
      message: "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID on the server first.",
    };
  }

  let failure: string | null = null;
  try {
    const phone = await fetchPhoneNumber(config.phoneNumberId, config.accessToken);
    if (!phone) {
      failure = "Meta did not accept the WhatsApp token saved on the server.";
    } else {
      const saved = await saveWhatsAppConnection({
        userId: auth.user.id,
        phoneNumberId: phone.id,
        displayPhoneNumber: phone.displayPhoneNumber,
        wabaId: null,
        businessName: phone.verifiedName,
        accessToken: null,
        tokenSource: "env",
        keepAutoReply: true,
      });
      if (!saved.ok) failure = saved.message;
    }
  } catch {
    failure = "Meta could not be reached. Try again in a moment.";
  }
  if (failure) return { message: failure };

  refreshInbox();
  redirect("/settings?whatsapp=connected");
}

export async function startWhatsAppOAuth(
  previous: WhatsAppFormState,
  formData: FormData,
): Promise<WhatsAppFormState> {
  void previous;
  void formData;
  const auth = await requireUser();
  if ("message" in auth) return { message: auth.message };

  const config = await readWhatsAppConfig();
  if (!config.oauthReady) {
    return { message: "Add META_APP_ID and META_APP_SECRET on the server first." };
  }
  const origin = await siteOrigin();
  if (!origin) return { message: "This site has no public address yet." };

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/whatsapp",
    maxAge: 600,
  });

  redirect(
    oauthDialogUrl({
      appId: config.appId,
      redirectUri: `${origin}/api/whatsapp/callback`,
      state,
      configId: config.embeddedSignup ? config.embeddedSignupConfigId : undefined,
    }),
  );
}

export async function disconnectWhatsApp(): Promise<void> {
  const auth = await requireUser();
  if ("message" in auth) redirect("/login");
  const removed = await disconnectWhatsAppConnection(auth.user.id);
  refreshInbox();
  if (!removed.ok) redirect("/settings?whatsapp=error&reason=disconnect");
  redirect("/settings?whatsapp=disconnected");
}

export async function setWhatsAppAutoReply(formData: FormData): Promise<void> {
  const auth = await requireUser();
  if ("message" in auth) return;
  const enabled = String(formData.get("autoReply") ?? "") === "on";
  await setWhatsAppAutoReplyEnabled(enabled);
  refreshInbox();
}

export async function loadThreadMessages(chatId: string): Promise<{
  messages: Message[];
  error?: string;
}> {
  const auth = await requireUser();
  if ("message" in auth) return { messages: [], error: auth.message };
  try {
    const messages = await listMessages(assertId(chatId, "Chat"));
    return { messages };
  } catch {
    return { messages: [], error: "Those messages could not be opened." };
  }
}

export async function sendWhatsAppReply(
  chatId: string,
  text: string,
): Promise<{ ok: true; message: Message } | { ok: false; message: string }> {
  const auth = await requireUser();
  if ("message" in auth) return { ok: false, message: auth.message };

  const content = text.trim();
  if (!content) return { ok: false, message: "Write a reply first." };
  if (content.length > 4096) {
    return { ok: false, message: "That reply is too long for WhatsApp." };
  }

  let id: string;
  try {
    id = assertId(chatId, "Chat");
  } catch {
    return { ok: false, message: "That chat could not be opened." };
  }

  const context = await whatsAppReplyContext(id);
  if (!context?.customer_phone) {
    return { ok: false, message: "Connect WhatsApp before sending." };
  }
  const token = await resolveSendToken(context);
  if (!token) {
    return {
      ok: false,
      message: "The WhatsApp token for this number is missing. Connect again in Settings.",
    };
  }

  try {
    const sent = await sendWhatsAppText({
      phoneNumberId: context.phone_number_id,
      accessToken: token,
      to: context.customer_phone,
      body: content,
    });
    if (!sent.ok) return sent;
  } catch {
    return { ok: false, message: "WhatsApp could not be reached. Try again in a moment." };
  }

  try {
    const saved = await createMessage({
      chat_id: id,
      role: "owner",
      content,
    });
    const nextStatus: ConversationStatus =
      context.chat_status === "hot" ? "followed_up" : "answered";
    await updateConversation(id, { status: nextStatus });
    refreshInbox();
    return { ok: true, message: saved };
  } catch {
    return {
      ok: false,
      message:
        "WhatsApp accepted the reply, but it could not be saved here. Refresh before sending again.",
    };
  }
}
