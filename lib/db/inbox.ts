import { draftCustomerReply, isReplyTone } from "@/lib/business-profile";
import {
  buyers,
  channelFilters,
  channelLabel,
  chats,
  dailySummary,
  channelTotals,
  type Channel,
  type Chat,
  type ChatStatus,
} from "@/lib/demo-data";
import { demoSignals, type ChatSignal } from "@/lib/nudges";
import type {
  ChatPreview,
  ConversationStatus,
  Customer,
} from "@/lib/db/types";

export type WorkspaceSource = "demo" | "live";

export type WorkspaceView = {
  source: WorkspaceSource;
  notice: string | null;
  summary: { chatsHandled: number; buyersReady: number };
  chats: Chat[];
  buyers: Chat[];
  channelTotals: { channel: Channel; label: string; count: number }[];
  whatsappConnected: boolean;
  whatsappAutoReply: boolean;
  signals: ChatSignal[];
};

const avatarTints = [
  { tint: "#F8E7A2", ink: "#8D6B12" },
  { tint: "#C9EBD8", ink: "#1F7A4D" },
  { tint: "#E6E7EB", ink: "#5F6670" },
  { tint: "#F8D7E8", ink: "#8A3E66" },
  { tint: "#D9E4FF", ink: "#2C4A8C" },
] as const;

export function demoWorkspace(): WorkspaceView {
  return {
    source: "demo",
    notice: null,
    summary: dailySummary,
    chats,
    buyers,
    channelTotals,
    whatsappConnected: false,
    whatsappAutoReply: false,
    signals: demoSignals(),
  };
}

/** Signed-in account with no saved chats and WhatsApp not connected yet. */
export function sampleWorkspace(): WorkspaceView {
  return {
    ...demoWorkspace(),
    notice:
      "Sample chats. Connect WhatsApp in Settings when you want your real number here.",
    signals: [],
  };
}

export function emptyChannelTotals(): WorkspaceView["channelTotals"] {
  return channelFilters.map((item) => ({
    channel: item.id,
    label: item.label,
    count: 0,
  }));
}

export function unavailableWorkspace(): WorkspaceView {
  return {
    source: "live",
    notice: "I could not open your saved chats yet. Refresh in a moment.",
    summary: { chatsHandled: 0, buyersReady: 0 },
    chats: [],
    buyers: [],
    channelTotals: emptyChannelTotals(),
    whatsappConnected: false,
    whatsappAutoReply: false,
    signals: [],
  };
}

function formatChatTime(iso: string | null, now: Date) {
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

function previewText(content: string | null) {
  if (!content) return "No messages yet.";
  const line = content.replace(/\s+/g, " ").trim();
  if (!line) return "No messages yet.";
  if (line.length <= 140) return line;
  return `${line.slice(0, 139)}…`;
}

function avatarFor(name: string, channel: Channel) {
  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  const colors =
    avatarTints[letter.charCodeAt(0) % avatarTints.length] ?? avatarTints[0];
  return {
    kind: "initial" as const,
    letter,
    tint: colors.tint,
    ink: colors.ink,
    badge: channel,
  };
}

function uiStatus(status: ConversationStatus): ChatStatus | undefined {
  if (
    status === "answered" ||
    status === "hot" ||
    status === "followed_up" ||
    status === "your_turn"
  ) {
    return status;
  }
  return undefined;
}

type InboxThread = {
  customerId: string;
  sort: number;
  preview: ChatPreview;
  chat: Chat;
};

function toInboxChat(preview: ChatPreview, now: Date): Chat {
  return {
    id: preview.id,
    name: preview.customer_name.trim() || "Customer",
    preview: previewText(preview.last_message),
    time: formatChatTime(preview.last_message_at ?? preview.updated_at, now),
    channels: [preview.channel],
    status: uiStatus(preview.status),
    showTurnNote: preview.status === "your_turn",
    avatar: avatarFor(preview.customer_name, preview.channel),
  };
}

function recency(iso: string | null, fallback: string) {
  const parsed = Date.parse(iso ?? fallback);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Turn saved rows into the inbox, buyers, and analytics the screens already render. */
export function workspaceFromRecords(
  customers: Customer[],
  previews: ChatPreview[],
  now = new Date(),
  whatsapp: { connected: boolean; autoReply: boolean } = {
    connected: false,
    autoReply: false,
  },
): WorkspaceView {
  const threads: InboxThread[] = previews
    .map((preview) => ({
      customerId: preview.customer_id,
      sort: recency(preview.last_message_at, preview.updated_at),
      preview,
      chat: toInboxChat(preview, now),
    }))
    .sort((a, b) => b.sort - a.sort);

  const seenBuyers = new Set<string>();
  const readyBuyers: Chat[] = [];
  for (const thread of threads) {
    const waiting =
      thread.preview.status === "hot" || thread.preview.status === "your_turn";
    const ready = thread.preview.ready_to_close;
    if (!waiting && !ready) continue;
    if (seenBuyers.has(thread.customerId)) continue;
    seenBuyers.add(thread.customerId);
    readyBuyers.push({
      ...thread.chat,
      status: thread.chat.status ?? "hot",
    });
  }

  for (const customer of customers) {
    if (!customer.ready_to_close || seenBuyers.has(customer.id)) continue;
    seenBuyers.add(customer.id);
    readyBuyers.push({
      id: customer.id,
      name: customer.name.trim() || "Customer",
      preview: "Ready for you.",
      time: formatChatTime(customer.updated_at, now),
      channels: [customer.channel],
      status: "hot",
      avatar: avatarFor(customer.name, customer.channel),
    });
  }

  const start = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const todays = previews.filter((preview) => {
    if (!preview.last_message_at) return false;
    const time = Date.parse(preview.last_message_at);
    return !Number.isNaN(time) && time >= start;
  });

  const counts: Record<Channel, number> = {
    whatsapp: 0,
    instagram: 0,
    email: 0,
  };
  for (const preview of todays) counts[preview.channel] += 1;

  return {
    source: "live",
    notice: null,
    summary: { chatsHandled: todays.length, buyersReady: readyBuyers.length },
    chats: threads.map((thread) => thread.chat),
    buyers: readyBuyers,
    channelTotals: channelFilters.map((item) => ({
      channel: item.id,
      label: channelLabel(item.id),
      count: counts[item.id],
    })),
    whatsappConnected: whatsapp.connected,
    whatsappAutoReply: whatsapp.autoReply,
    signals: chatSignals(threads, customers),
  };
}

function chatSignals(threads: InboxThread[], customers: Customer[]): ChatSignal[] {
  const signals: ChatSignal[] = threads.map((thread) => ({
    chatId: thread.preview.id,
    customerId: thread.preview.customer_id,
    name: thread.chat.name,
    preview: thread.chat.preview,
    status: thread.preview.status,
    readyToClose: thread.preview.ready_to_close,
  }));
  const seen = new Set(signals.map((signal) => signal.customerId));
  for (const customer of customers) {
    if (!customer.ready_to_close || seen.has(customer.id)) continue;
    seen.add(customer.id);
    signals.push({
      chatId: null,
      customerId: customer.id,
      name: customer.name.trim() || "Customer",
      preview: "Ready for you.",
      status: "hot",
      readyToClose: true,
    });
  }
  return signals;
}

export function liveHighlights(workspace: WorkspaceView) {
  const lines: string[] = [];
  const ready = workspace.summary.buyersReady;
  if (ready > 0) {
    lines.push(
      `${ready} ${ready === 1 ? "buyer is" : "buyers are"} ready for you.`,
    );
  }
  for (const buyer of workspace.buyers.slice(0, 3)) {
    lines.push(`${buyer.name}: ${buyer.preview}`);
  }
  if (lines.length === 0) {
    lines.push(
      workspace.whatsappConnected
        ? "No WhatsApp chats are waiting on you."
        : "Connect WhatsApp in Settings to watch this number.",
    );
  }
  return lines;
}

export function liveAssistantPrompts(
  workspace: WorkspaceView,
  shop?: { business_name: string; reply_tone: string | null } | null,
) {
  const waiting = workspace.buyers;
  const first = waiting[0];
  const firstName = first?.name.split(" ")[0] ?? "";
  const who =
    waiting.length === 0
      ? "Nobody is waiting on you right now. New WhatsApp messages will show up in the inbox."
      : `Start here. ${waiting
          .slice(0, 3)
          .map((buyer) => `${buyer.name}: ${buyer.preview}`)
          .join(" ")}`;
  const handled = workspace.summary.chatsHandled;
  const ready = workspace.summary.buyersReady;
  const tone = isReplyTone(shop?.reply_tone) ? shop.reply_tone : "friendly";
  const draft = !first
    ? shop
      ? `When a customer messages ${shop.business_name}, I will draft the reply here. Nothing goes out until you send it from the inbox.`
      : "When a customer messages you, I will draft the reply here. Nothing goes out until you send it from the inbox."
    : shop
      ? draftCustomerReply({
          tone,
          firstName,
          businessName: shop.business_name,
          preview: first.preview,
        })
      : `Hi ${firstName}! Thanks for messaging us. I can help with “${first.preview}” Send it from the inbox when you want it to go out on WhatsApp.`;
  return [
    { id: "who", label: "Who should I talk to?", reply: who },
    {
      id: "today",
      label: "How was today?",
      reply: `I handled ${handled} ${handled === 1 ? "chat" : "chats"} today. ${ready} ${ready === 1 ? "buyer is" : "buyers are"} ready for you.`,
    },
    {
      id: "draft",
      label: first ? `Draft a reply to ${firstName}` : "Draft a reply",
      reply: draft,
    },
  ];
}
