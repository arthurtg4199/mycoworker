import {
  isReplyTone,
  profileLimits,
  type ReplyTone,
} from "@/lib/business-profile";
import type { Channel } from "@/lib/demo-data";
import type {
  AppointmentInput,
  AppointmentPatch,
  AppointmentStatus,
  BusinessProfileInput,
  ConversationInput,
  ConversationPatch,
  ConversationStatus,
  CustomerInput,
  CustomerPatch,
  MessageInput,
  MessageRole,
  PaymentInput,
  PaymentPatch,
  PaymentStatus,
} from "@/lib/db/types";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertId(value: string, label: string) {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} is not valid.`);
  }
  return value;
}

export function assertChannel(value: string): Channel {
  if (value === "whatsapp" || value === "instagram" || value === "email") {
    return value;
  }
  throw new Error("Channel must be WhatsApp, Instagram, or email.");
}

function assertConversationStatus(value: string): ConversationStatus {
  if (
    value === "open" ||
    value === "answered" ||
    value === "hot" ||
    value === "followed_up" ||
    value === "your_turn" ||
    value === "closed"
  ) {
    return value;
  }
  throw new Error("That chat status is not valid.");
}

function assertMessageRole(value: string): MessageRole {
  if (value === "user" || value === "assistant" || value === "owner") {
    return value;
  }
  throw new Error("That message role is not valid.");
}

function assertAppointmentStatus(value: string): AppointmentStatus {
  if (value === "scheduled" || value === "completed" || value === "cancelled") {
    return value;
  }
  throw new Error("That appointment status is not valid.");
}

function assertPaymentStatus(value: string): PaymentStatus {
  if (
    value === "pending" ||
    value === "confirmed" ||
    value === "failed" ||
    value === "refunded"
  ) {
    return value;
  }
  throw new Error("That payment status is not valid.");
}

function requiredText(value: string, max: number, label: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  if (trimmed.length > max) throw new Error(`${label} is too long.`);
  return trimmed;
}

function optionalText(
  value: string | null | undefined,
  max: number,
  label: string,
) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${label} is too long.`);
  return trimmed;
}

function optionalEmail(value: string | null | undefined) {
  const email = optionalText(value, 320, "Email");
  if (!email) return email;
  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

function assertHappiness(value: number | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error("Happiness must be a whole number from 0 to 100.");
  }
  return value;
}

export function assertAmount(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999_999.99) {
    throw new Error("Amount must be zero or more.");
  }
  const cents = Math.round(value * 100);
  if (Math.abs(value * 100 - cents) > 1e-6) {
    throw new Error("Amount can use up to two decimal places.");
  }
  return cents / 100;
}

function assertCurrency(value: string | undefined) {
  const currency = (value ?? "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a 3-letter code.");
  }
  return currency;
}

function optionalCurrency(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const currency = value.trim().toUpperCase();
  if (!currency) return null;
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Currency must be a 3-letter code, such as NGN.");
  }
  return currency;
}

function assertReplyTone(value: string | null | undefined): ReplyTone {
  if (value === undefined || value === null || value.trim() === "") {
    return "friendly";
  }
  if (!isReplyTone(value)) throw new Error("Choose a reply style.");
  return value;
}

export function assertTimestamp(value: string, label: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) throw new Error(`${label} must be a date.`);
  return new Date(parsed).toISOString();
}

function assertPatch(patch: object) {
  if (Object.values(patch).every((value) => value === undefined)) {
    throw new Error("Nothing to update.");
  }
}

export function customerInsert(input: CustomerInput) {
  return {
    name: requiredText(input.name, 120, "Name"),
    channel: assertChannel(input.channel),
    phone: optionalText(input.phone, 40, "Phone") ?? null,
    email: optionalEmail(input.email) ?? null,
    mood: optionalText(input.mood, 40, "Mood") ?? null,
    happiness: assertHappiness(input.happiness) ?? null,
    ready_to_close: input.ready_to_close ?? false,
    notes: optionalText(input.notes, 4000, "Notes") ?? null,
  };
}

export function customerUpdate(input: CustomerPatch) {
  const patch = {
    name:
      input.name === undefined ? undefined : requiredText(input.name, 120, "Name"),
    channel:
      input.channel === undefined ? undefined : assertChannel(input.channel),
    phone: optionalText(input.phone, 40, "Phone"),
    email: optionalEmail(input.email),
    mood: optionalText(input.mood, 40, "Mood"),
    happiness: assertHappiness(input.happiness),
    ready_to_close: input.ready_to_close,
    notes: optionalText(input.notes, 4000, "Notes"),
  };
  assertPatch(patch);
  return patch;
}

export function conversationInsert(input: ConversationInput) {
  return {
    customer_id: assertId(input.customer_id, "Customer"),
    channel: assertChannel(input.channel),
    status: input.status ? assertConversationStatus(input.status) : "open",
  } as const;
}

export function conversationUpdate(input: ConversationPatch) {
  const patch = {
    customer_id:
      input.customer_id === undefined
        ? undefined
        : assertId(input.customer_id, "Customer"),
    channel:
      input.channel === undefined ? undefined : assertChannel(input.channel),
    status:
      input.status === undefined
        ? undefined
        : assertConversationStatus(input.status),
  };
  assertPatch(patch);
  return patch;
}

export function messageInsert(input: MessageInput) {
  return {
    chat_id: assertId(input.chat_id, "Chat"),
    role: assertMessageRole(input.role),
    content: requiredText(input.content, 8000, "Message"),
  };
}

export function appointmentInsert(input: AppointmentInput) {
  return {
    customer_id: assertId(input.customer_id, "Customer"),
    title: requiredText(input.title, 160, "Title"),
    scheduled_at: assertTimestamp(input.scheduled_at, "Appointment time"),
    status: input.status ? assertAppointmentStatus(input.status) : "scheduled",
  } as const;
}

export function appointmentUpdate(input: AppointmentPatch) {
  const patch = {
    customer_id:
      input.customer_id === undefined
        ? undefined
        : assertId(input.customer_id, "Customer"),
    title:
      input.title === undefined
        ? undefined
        : requiredText(input.title, 160, "Title"),
    scheduled_at:
      input.scheduled_at === undefined
        ? undefined
        : assertTimestamp(input.scheduled_at, "Appointment time"),
    status:
      input.status === undefined
        ? undefined
        : assertAppointmentStatus(input.status),
  };
  assertPatch(patch);
  return patch;
}

export function profileUpsert(input: BusinessProfileInput) {
  return {
    business_name: requiredText(
      input.business_name,
      profileLimits.business_name,
      "Business name",
    ),
    what_they_sell:
      optionalText(
        input.what_they_sell,
        profileLimits.what_they_sell,
        "What you sell",
      ) ?? null,
    hours: optionalText(input.hours, profileLimits.hours, "Hours") ?? null,
    location:
      optionalText(input.location, profileLimits.location, "City") ?? null,
    reply_tone: assertReplyTone(input.reply_tone),
    currency: optionalCurrency(input.currency),
  };
}

export function paymentInsert(input: PaymentInput) {
  const status = input.status ? assertPaymentStatus(input.status) : "pending";
  return {
    customer_id: assertId(input.customer_id, "Customer"),
    amount: assertAmount(input.amount),
    currency: assertCurrency(input.currency),
    status,
    confirmed_at:
      input.confirmed_at === undefined
        ? status === "confirmed"
          ? new Date().toISOString()
          : null
        : input.confirmed_at === null
          ? null
          : assertTimestamp(input.confirmed_at, "Confirmed time"),
  };
}

export function paymentUpdate(input: PaymentPatch) {
  const patch = {
    customer_id:
      input.customer_id === undefined
        ? undefined
        : assertId(input.customer_id, "Customer"),
    amount: input.amount === undefined ? undefined : assertAmount(input.amount),
    currency:
      input.currency === undefined ? undefined : assertCurrency(input.currency),
    status:
      input.status === undefined ? undefined : assertPaymentStatus(input.status),
    confirmed_at:
      input.confirmed_at === undefined
        ? input.status === "confirmed"
          ? new Date().toISOString()
          : undefined
        : input.confirmed_at === null
          ? null
          : assertTimestamp(input.confirmed_at, "Confirmed time"),
  };
  assertPatch(patch);
  return patch;
}
