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
): WorkspaceView {
  const threads = previews
    .map((preview) => ({
      customerId: preview.customer_id,
      sort: recency(preview.last_message_at, preview.updated_at),
      chat: toInboxChat(preview, now),
    }))
    .sort((a, b) => b.sort - a.sort);

  const threadByCustomer = new Map<string, Chat>();
  for (const thread of threads) {
    if (!threadByCustomer.has(thread.customerId)) {
      threadByCustomer.set(thread.customerId, thread.chat);
    }
  }

  const readyBuyers = customers
    .filter((customer) => customer.ready_to_close)
    .map((customer) => {
      const existing = threadByCustomer.get(customer.id);
      if (existing) {
        return { ...existing, status: existing.status ?? ("hot" as const) };
      }
      return {
        id: customer.id,
        name: customer.name.trim() || "Customer",
        preview: "Ready for you.",
        time: formatChatTime(customer.updated_at, now),
        channels: [customer.channel],
        status: "hot" as const,
        avatar: avatarFor(customer.name, customer.channel),
      };
    });

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
  };
}
