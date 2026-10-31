export const profileLimits = {
  business_name: 120,
  what_they_sell: 500,
  hours: 240,
  location: 120,
} as const;

export const replyTones = [
  {
    id: "friendly",
    label: "Friendly",
    hint: "Warm, like someone at the counter",
  },
  {
    id: "warm",
    label: "Warm",
    hint: "Kind and a little personal",
  },
  {
    id: "professional",
    label: "Professional",
    hint: "Calm and clear",
  },
  {
    id: "brief",
    label: "Brief",
    hint: "Short, with no extra words",
  },
  {
    id: "playful",
    label: "Playful",
    hint: "Light and upbeat",
  },
] as const;

export type ReplyTone = (typeof replyTones)[number]["id"];

export const currencyChoices = [
  { code: "NGN", label: "NGN · Naira" },
  { code: "USD", label: "USD · US dollar" },
  { code: "GBP", label: "GBP · Pound" },
  { code: "EUR", label: "EUR · Euro" },
  { code: "GHS", label: "GHS · Cedi" },
  { code: "KES", label: "KES · Shilling" },
  { code: "ZAR", label: "ZAR · Rand" },
] as const;

export type BusinessProfileFields = {
  business_name: string;
  what_they_sell: string;
  hours: string;
  location: string;
  reply_tone: ReplyTone;
  currency: string;
};

export type ProfileFormState = {
  ok?: boolean;
  demo?: boolean;
  message?: string;
  fields?: BusinessProfileFields;
};

export const BUSINESS_PROFILE_STORAGE_KEY = "mycoworker.business-profile";

const CHANGE_EVENT = "mycoworker-business-profile";

export function isReplyTone(value: unknown): value is ReplyTone {
  return (
    typeof value === "string" && replyTones.some((tone) => tone.id === value)
  );
}

export function replyToneLabel(id: string) {
  return replyTones.find((tone) => tone.id === id)?.label ?? "Friendly";
}

export function replyToneHint(id: string) {
  return (
    replyTones.find((tone) => tone.id === id)?.hint ??
    replyTones[0].hint
  );
}

export function emptyProfileFields(): BusinessProfileFields {
  return {
    business_name: "",
    what_they_sell: "",
    hours: "",
    location: "",
    reply_tone: "friendly",
    currency: "",
  };
}

/** Sample shop for demo mode, before the owner saves their own. */
export function demoProfileFields(): BusinessProfileFields {
  return {
    business_name: "Ada's Cakes",
    what_they_sell: "Birthday cakes and custom orders",
    hours: "Mon–Sat, 9am–6pm",
    location: "Lagos",
    reply_tone: "friendly",
    currency: "NGN",
  };
}

export function fieldsFromProfile(
  profile: {
    business_name: string;
    what_they_sell: string | null;
    hours: string | null;
    location: string | null;
    reply_tone: string | null;
    currency: string | null;
  } | null,
): BusinessProfileFields {
  if (!profile) return emptyProfileFields();
  const currency = profile.currency?.trim().toUpperCase() ?? "";
  return {
    business_name: profile.business_name,
    what_they_sell: profile.what_they_sell ?? "",
    hours: profile.hours ?? "",
    location: profile.location ?? "",
    reply_tone: isReplyTone(profile.reply_tone) ? profile.reply_tone : "friendly",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "",
  };
}

export function assistantIntro(shop: {
  business_name: string;
  location: string | null;
  what_they_sell: string | null;
}) {
  const where = shop.location ? ` in ${shop.location}` : "";
  const sells = shop.what_they_sell ? ` ${shop.what_they_sell}.` : "";
  return `I look after ${shop.business_name}${where}.${sells} Ask me about today.`;
}

export function draftCustomerReply(input: {
  tone: ReplyTone;
  firstName: string;
  businessName: string;
  preview: string;
}) {
  const opener = replyOpener(input.tone, input.firstName, input.businessName);
  return `${opener} I can help with “${input.preview}” Send it from the inbox when you want it to go out on WhatsApp.`;
}

function replyOpener(tone: ReplyTone, firstName: string, businessName: string) {
  if (tone === "professional") {
    return `Hello ${firstName}. Thank you for contacting ${businessName}.`;
  }
  if (tone === "brief") {
    return `Hi ${firstName} — ${businessName} here.`;
  }
  if (tone === "playful") {
    return `Hi ${firstName}! ${businessName} got your note.`;
  }
  if (tone === "warm") {
    return `Hi ${firstName}, so glad you wrote to ${businessName}.`;
  }
  return `Hi ${firstName}! Thanks for messaging ${businessName}.`;
}

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return "";
  return trimmed;
}

export function parseStoredProfile(raw: string | null): BusinessProfileFields | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const business_name = clip(record.business_name, profileLimits.business_name);
    if (!business_name) return null;
    const currency = clip(record.currency, 3).toUpperCase();
    return {
      business_name,
      what_they_sell: clip(record.what_they_sell, profileLimits.what_they_sell),
      hours: clip(record.hours, profileLimits.hours),
      location: clip(record.location, profileLimits.location),
      reply_tone: isReplyTone(record.reply_tone) ? record.reply_tone : "friendly",
      currency: /^[A-Z]{3}$/.test(currency) ? currency : "",
    };
  } catch {
    return null;
  }
}

let snapshot: BusinessProfileFields | null = null;
let snapshotRaw: string | null = null;
let memoryRaw: string | null = null;

export function readStoredBusinessProfile(): BusinessProfileFields | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(BUSINESS_PROFILE_STORAGE_KEY);
  } catch {
    raw = memoryRaw;
  }
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  snapshot = parseStoredProfile(raw);
  return snapshot;
}

export function writeStoredBusinessProfile(fields: BusinessProfileFields) {
  const raw = JSON.stringify(fields);
  memoryRaw = raw;
  snapshotRaw = raw;
  snapshot = fields;
  try {
    window.localStorage.setItem(BUSINESS_PROFILE_STORAGE_KEY, raw);
    memoryRaw = null;
  } catch {
    // This tab still has the shop in memory.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeBusinessProfile(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}
