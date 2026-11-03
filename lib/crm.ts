import { chats, channelLabel, type AvatarSpec, type Channel, type Chat } from "@/lib/demo-data";
import type { CustomerStage, PaymentStatus } from "@/lib/db/types";

export type CrmMode = "demo" | "sample" | "live";

export type CrmListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  channel: Channel | null;
  stage: CustomerStage;
  notes: string;
  lastMessageLabel: string;
};

export type CrmMessage = {
  id: string;
  who: string;
  content: string;
  when: string;
};

export type CrmPayment = {
  id: string;
  amountLabel: string;
  statusLabel: string;
  when: string;
};

export type CrmDetail = CrmListItem & {
  messages: CrmMessage[];
  payments: CrmPayment[];
};

export type CrmEdit = {
  stage: CustomerStage;
  notes: string;
};

export type CrmEdits = Record<string, CrmEdit>;

export const CRM_STORAGE_KEY = "mycoworker.customer-crm";
export const CRM_NOTES_MAX = 4000;

const CHANGE_EVENT = "mycoworker-customer-crm";
const emptyEdits: CrmEdits = {};

export const stageOptions: { id: CustomerStage; label: string }[] = [
  { id: "new", label: "New" },
  { id: "interested", label: "Interested" },
  { id: "paid", label: "Paid" },
  { id: "follow_up", label: "Follow up" },
];

const avatarTints = [
  { tint: "#F8E7A2", ink: "#8D6B12" },
  { tint: "#C9EBD8", ink: "#1F7A4D" },
  { tint: "#E6E7EB", ink: "#5F6670" },
  { tint: "#F8D7E8", ink: "#8A3E66" },
  { tint: "#D9E4FF", ink: "#2C4A8C" },
] as const;

const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  failed: "Failed",
  refunded: "Refunded",
};

type DemoMessage = {
  role: "user" | "assistant" | "owner";
  content: string;
  when: string;
};

type DemoPayment = {
  amount: number;
  currency: string;
  status: PaymentStatus;
  when: string;
};

type DemoExtra = {
  phone: string;
  email: string | null;
  stage: CustomerStage;
  notes: string;
  messages: DemoMessage[];
  payments: DemoPayment[];
};

const demoExtras: Record<string, DemoExtra> = {
  sarah: {
    phone: "+234 802 441 2201",
    email: "sarah@example.com",
    stage: "paid",
    notes: "Paid for the order. Likes WhatsApp.",
    messages: [
      { role: "user", content: "Can I pick it up tomorrow?", when: "9:12 AM" },
      { role: "assistant", content: "Yes, tomorrow works.", when: "9:20 AM" },
      { role: "user", content: "Thanks! That works perfectly.", when: "9:40 AM" },
    ],
    payments: [
      { amount: 25000, currency: "NGN", status: "confirmed", when: "Today" },
    ],
  },
  james: {
    phone: "+234 803 118 9044",
    email: null,
    stage: "interested",
    notes: "Asked for blue, size 10. Sounds ready to buy.",
    messages: [
      { role: "user", content: "Hi, is the blue one still in stock?", when: "9:10 AM" },
      {
        role: "user",
        content: "Do you have it in blue and size 10?",
        when: "9:38 AM",
      },
    ],
    payments: [],
  },
  priya: {
    phone: "+234 809 552 1170",
    email: "priya@example.com",
    stage: "follow_up",
    notes: "Wants the details sent by email.",
    messages: [
      { role: "owner", content: "I can send the details over.", when: "9:22 AM" },
      { role: "user", content: "Great, please send the details.", when: "9:35 AM" },
    ],
    payments: [],
  },
  mark: {
    phone: "+234 701 334 8821",
    email: null,
    stage: "new",
    notes: "",
    messages: [
      { role: "user", content: "Is the offer still available?", when: "9:31 AM" },
    ],
    payments: [],
  },
  aisha: {
    phone: "+234 813 990 4412",
    email: null,
    stage: "paid",
    notes: "Paid and said thank you.",
    messages: [{ role: "user", content: "Okay, thank you!", when: "Yesterday" }],
    payments: [
      { amount: 12000, currency: "NGN", status: "confirmed", when: "Yesterday" },
    ],
  },
  ryan: {
    phone: "+234 705 221 7783",
    email: null,
    stage: "follow_up",
    notes: "Wants a call. Follow up tomorrow.",
    messages: [
      { role: "user", content: "Can we schedule a call?", when: "Yesterday" },
    ],
    payments: [],
  },
};

export function isCustomerStage(value: unknown): value is CustomerStage {
  return stageOptions.some((option) => option.id === value);
}

export function stageLabel(stage: CustomerStage) {
  return stageOptions.find((option) => option.id === stage)?.label ?? "New";
}

export function stageFromUnknown(value: unknown): CustomerStage {
  return isCustomerStage(value) ? value : "new";
}

export function contactLine(customer: Pick<CrmListItem, "phone" | "channel">) {
  const channel = customer.channel ? channelLabel(customer.channel) : null;
  if (customer.phone && channel) return `${customer.phone} · ${channel}`;
  if (customer.phone) return customer.phone;
  return channel ?? "Chat";
}

export function matchesCustomerQuery(
  customer: Pick<CrmListItem, "name" | "phone">,
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (customer.name.toLowerCase().includes(q)) return true;
  const phone = customer.phone ?? "";
  if (phone.toLowerCase().includes(q)) return true;
  const queryDigits = q.replace(/\D/g, "");
  if (queryDigits.length < 3) return false;
  const phoneDigits = phone.replace(/\D/g, "");
  if (!phoneDigits) return false;
  if (phoneDigits.includes(queryDigits)) return true;
  const localQuery = queryDigits.replace(/^0/, "");
  const localPhone = phoneDigits.replace(/^234/, "");
  return localQuery.length >= 3 && localPhone.includes(localQuery);
}

export function formatMoney(amount: number, currency: string) {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : "NGN";
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function paymentStatusLabel(status: string) {
  if (
    status === "pending" ||
    status === "confirmed" ||
    status === "failed" ||
    status === "refunded"
  ) {
    return paymentStatusLabels[status];
  }
  return "Pending";
}

export function formatWhen(iso: string | null, now = new Date()) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function lastMessageLabel(iso: string | null, now = new Date()) {
  return formatWhen(iso, now) || "No chats yet";
}

export function whoLabel(role: string) {
  if (role === "user") return "Customer";
  if (role === "assistant") return "MyCoWorker";
  if (role === "owner") return "You";
  return "Message";
}

export function avatarForCustomer(
  id: string,
  name: string,
  channel: Channel | null,
): AvatarSpec {
  const known = chats.find((chat) => chat.id === id);
  if (known) return known.avatar;
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  const colors =
    avatarTints[letter.charCodeAt(0) % avatarTints.length] ?? avatarTints[0];
  return {
    kind: "initial",
    letter,
    tint: colors.tint,
    ink: colors.ink,
    badge: channel ?? undefined,
  };
}

function demoChannel(chat: Chat): Channel | null {
  return chat.channels[0] ?? null;
}

function demoDetail(chat: Chat): CrmDetail {
  const extra = demoExtras[chat.id];
  const channel = demoChannel(chat);
  const messages = extra?.messages ?? [
    { role: "user" as const, content: chat.preview, when: chat.time },
  ];
  const payments = extra?.payments ?? [];
  return {
    id: chat.id,
    name: chat.name,
    phone: extra?.phone ?? null,
    email: extra?.email ?? null,
    channel,
    stage: extra?.stage ?? "new",
    notes: extra?.notes ?? "",
    lastMessageLabel: chat.time || "No chats yet",
    messages: messages
      .map((message, index) => ({
        id: `${chat.id}-msg-${index}`,
        who: whoLabel(message.role),
        content: message.content,
        when: message.when,
      }))
      .reverse(),
    payments: payments.map((payment, index) => ({
      id: `${chat.id}-pay-${index}`,
      amountLabel: formatMoney(payment.amount, payment.currency),
      statusLabel: paymentStatusLabel(payment.status),
      when: payment.when,
    })),
  };
}

export function demoCustomerList(): CrmListItem[] {
  return chats.map((chat) => {
    const detail = demoDetail(chat);
    return {
      id: detail.id,
      name: detail.name,
      phone: detail.phone,
      email: detail.email,
      channel: detail.channel,
      stage: detail.stage,
      notes: detail.notes,
      lastMessageLabel: detail.lastMessageLabel,
    };
  });
}

export function demoCustomerDetail(id: string): CrmDetail | null {
  const chat = chats.find((item) => item.id === id);
  if (!chat) return null;
  return demoDetail(chat);
}

export function applyCrmEdit<T extends CrmListItem>(customer: T, edit: CrmEdit | undefined): T {
  if (!edit) return customer;
  return { ...customer, stage: edit.stage, notes: edit.notes };
}

let snapshot: CrmEdits = emptyEdits;
let snapshotRaw: string | null = null;
let memoryRaw: string | null = null;

export function parseStoredCrm(raw: string | null): CrmEdits {
  if (!raw) return emptyEdits;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return emptyEdits;
    const edits: CrmEdits = {};
    for (const [id, item] of Object.entries(value)) {
      if (!/^[A-Za-z0-9-]{1,80}$/.test(id)) continue;
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      if (!isCustomerStage(record.stage)) continue;
      const notes = typeof record.notes === "string" ? record.notes.slice(0, CRM_NOTES_MAX) : "";
      edits[id] = { stage: record.stage, notes };
    }
    return edits;
  } catch {
    return emptyEdits;
  }
}

export function readStoredCrmEdits(): CrmEdits {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CRM_STORAGE_KEY);
  } catch {
    raw = memoryRaw;
  }
  if (raw === snapshotRaw) return snapshot;
  snapshotRaw = raw;
  snapshot = parseStoredCrm(raw);
  return snapshot;
}

export function writeStoredCrmEdit(id: string, edit: CrmEdit) {
  if (!/^[A-Za-z0-9-]{1,80}$/.test(id) || !isCustomerStage(edit.stage)) return;
  const notes = edit.notes.slice(0, CRM_NOTES_MAX);
  const next = { ...readStoredCrmEdits(), [id]: { stage: edit.stage, notes } };
  const raw = JSON.stringify(next);
  memoryRaw = raw;
  snapshotRaw = raw;
  snapshot = next;
  try {
    window.localStorage.setItem(CRM_STORAGE_KEY, raw);
    memoryRaw = null;
  } catch {
    // This tab still has the edit in memory.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeCrmEdits(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}
