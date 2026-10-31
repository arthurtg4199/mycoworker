import { parseWhatsAppWebhook } from "@/lib/whatsapp/payload";
import { tokensMatch, whatsAppSignatureMatches } from "@/lib/whatsapp/crypto";
import { WHATSAPP_AUTO_REPLY } from "@/lib/whatsapp/copy";
import { readWhatsAppConfig } from "@/lib/whatsapp/env";
import { sendWhatsAppText } from "@/lib/whatsapp/graph";
import { isBuyingIntent } from "@/lib/whatsapp/intent";
import {
  ingestWhatsAppMessage,
  recordWhatsAppAutoReply,
  resolveSendToken,
} from "@/lib/whatsapp/store";

function plain(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const config = await readWhatsAppConfig();
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") ?? "";
  const challenge = url.searchParams.get("hub.challenge") ?? "";

  if (!config.webhookReady) {
    return plain("Webhook verify token is not configured.", 503);
  }
  if (mode === "subscribe" && challenge && tokensMatch(token, config.verifyToken)) {
    return plain(challenge, 200);
  }
  return plain("Forbidden", 403);
}

export async function POST(request: Request) {
  const config = await readWhatsAppConfig();
  if (!config.appSecret) {
    return plain("META_APP_SECRET is not configured.", 503);
  }
  if (!config.webhookReady) {
    return plain("Webhook verify token is not configured.", 503);
  }

  const raw = await request.text();
  if (raw.length > 1_000_000) return plain("Payload too large.", 413);
  if (
    !whatsAppSignatureMatches(
      raw,
      request.headers.get("x-hub-signature-256"),
      config.appSecret,
    )
  ) {
    return plain("Invalid signature.", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    return plain("Invalid JSON.", 400);
  }

  const inbound = parseWhatsAppWebhook(payload);
  if (inbound.length === 0) return plain("ok", 200);

  let retry = false;
  const autoReplied = new Set<string>();

  for (const message of inbound) {
    const saved = await ingestWhatsAppMessage({
      verifyToken: config.verifyToken,
      phoneNumberId: message.phoneNumberId,
      waMessageId: message.waMessageId,
      from: message.from,
      profileName: message.profileName ?? "",
      body: message.body,
      hot: message.kind === "text" && isBuyingIntent(message.body),
    });

    if (!saved.ok) {
      retry = true;
      continue;
    }
    if (!saved.result.stored) {
      if (
        saved.result.reason === "unauthorized" ||
        saved.result.reason === "query"
      ) {
        retry = true;
      }
      continue;
    }
    if (
      saved.result.duplicate ||
      !saved.result.auto_reply ||
      !saved.result.chat_id ||
      !saved.result.customer_phone ||
      !saved.result.phone_number_id
    ) {
      continue;
    }
    if (autoReplied.has(saved.result.chat_id)) continue;

    const token = await resolveSendToken({
      token_source: saved.result.token_source ?? "",
      access_token: saved.result.access_token ?? null,
      phone_number_id: saved.result.phone_number_id,
    });
    if (!token) continue;

    try {
      const sent = await sendWhatsAppText({
        phoneNumberId: saved.result.phone_number_id,
        accessToken: token,
        to: saved.result.customer_phone,
        body: WHATSAPP_AUTO_REPLY,
      });
      if (!sent.ok) continue;
      autoReplied.add(saved.result.chat_id);
      await recordWhatsAppAutoReply({
        verifyToken: config.verifyToken,
        chatId: saved.result.chat_id,
        content: WHATSAPP_AUTO_REPLY,
        status: "answered",
      });
    } catch (error) {
      console.error(
        "WhatsApp auto-reply failed.",
        error instanceof Error ? error.name : "Error",
      );
    }
  }

  if (retry) return plain("Retry later.", 503);
  return plain("ok", 200);
}
