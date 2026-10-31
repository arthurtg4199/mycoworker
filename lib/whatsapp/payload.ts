export type InboundWhatsApp = {
  phoneNumberId: string;
  waMessageId: string;
  from: string;
  profileName: string | null;
  body: string;
  kind: "text" | "other";
};

const otherLabels: Record<string, string> = {
  image: "[Image]",
  audio: "[Voice note]",
  video: "[Video]",
  document: "[Document]",
  sticker: "[Sticker]",
  location: "[Location]",
  contacts: "[Contact card]",
  unsupported: "[Unsupported message]",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function messageBody(message: Record<string, unknown>) {
  const type = textValue(message.type);
  if (type === "text" && isRecord(message.text)) {
    const body = textValue(message.text.body);
    if (body) return { body, kind: "text" as const };
  }
  if (type === "button" && isRecord(message.button)) {
    const body = textValue(message.button.text);
    if (body) return { body, kind: "text" as const };
  }
  if (type === "interactive" && isRecord(message.interactive)) {
    const buttonReply = isRecord(message.interactive.button_reply)
      ? textValue(message.interactive.button_reply.title)
      : "";
    const listReply = isRecord(message.interactive.list_reply)
      ? textValue(message.interactive.list_reply.title)
      : "";
    const body = buttonReply || listReply;
    if (body) return { body, kind: "text" as const };
  }
  if (type === "reaction" || type === "system" || type === "ephemeral") {
    return null;
  }
  const label = otherLabels[type] ?? "[Message]";
  return { body: label, kind: "other" as const };
}

function profileNameFor(
  contacts: unknown,
  from: string,
) {
  if (!Array.isArray(contacts)) return null;
  for (const contact of contacts) {
    if (!isRecord(contact)) continue;
    const waId = textValue(contact.wa_id);
    if (waId && waId !== from) continue;
    if (!isRecord(contact.profile)) continue;
    const name = textValue(contact.profile.name);
    if (name) return name.slice(0, 120);
  }
  return null;
}

/**
 * Pull inbound customer messages out of a Meta webhook body.
 * Status receipts and Instagram or Facebook objects are ignored.
 */
export function parseWhatsAppWebhook(payload: unknown): InboundWhatsApp[] {
  if (!isRecord(payload)) return [];
  if (payload.object !== "whatsapp_business_account") return [];
  if (!Array.isArray(payload.entry)) return [];

  const inbound: InboundWhatsApp[] = [];

  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      if (!isRecord(change) || change.field !== "messages") continue;
      if (!isRecord(change.value)) continue;
      const metadata = isRecord(change.value.metadata)
        ? change.value.metadata
        : null;
      const phoneNumberId = textValue(metadata?.phone_number_id);
      if (!phoneNumberId) continue;
      if (!Array.isArray(change.value.messages)) continue;

      for (const message of change.value.messages) {
        if (!isRecord(message)) continue;
        const waMessageId = textValue(message.id);
        const from = textValue(message.from);
        if (!waMessageId || !from) continue;
        const parsed = messageBody(message);
        if (!parsed) continue;
        inbound.push({
          phoneNumberId,
          waMessageId: waMessageId.slice(0, 255),
          from,
          profileName: profileNameFor(change.value.contacts, from),
          body: parsed.body.slice(0, 8000),
          kind: parsed.kind,
        });
      }
    }
  }

  return inbound;
}
