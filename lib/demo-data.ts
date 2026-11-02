import { scoreBuyingIntent } from "@/lib/hot-buyer";

export type Channel = "whatsapp" | "instagram" | "email";

export type ChatStatus = "answered" | "hot" | "followed_up" | "your_turn";

export type AvatarSpec =
  | { kind: "channel"; channel: Channel; badge?: Channel }
  | {
      kind: "initial";
      letter: string;
      tint: string;
      ink: string;
      badge?: Channel;
    };

export type Chat = {
  id: string;
  name: string;
  preview: string;
  time: string;
  channels: Channel[];
  status?: ChatStatus;
  showTurnNote?: boolean;
  hot?: boolean;
  avatar: AvatarSpec;
};

export const dailySummary = {
  chatsHandled: 42,
  buyersReady: 3,
};

export const chats: Chat[] = [
  {
    id: "tunde",
    name: "Tunde Adeyemi",
    preview: "Abeg how much last? I go take 2. Send account.",
    time: "9:42 AM",
    channels: ["whatsapp"],
    avatar: {
      kind: "initial",
      letter: "T",
      tint: "#E4DCFF",
      ink: "#6C4CE0",
      badge: "whatsapp",
    },
  },
  {
    id: "sarah",
    name: "Sarah Mitchell",
    preview: "Thanks! That works perfectly.",
    time: "9:40 AM",
    channels: ["whatsapp"],
    status: "answered",
    avatar: { kind: "channel", channel: "whatsapp" },
  },
  {
    id: "james",
    name: "James Carter",
    preview: "Do you have it in blue and size 10?",
    time: "9:38 AM",
    channels: ["instagram", "whatsapp"],
    status: "hot",
    avatar: { kind: "channel", channel: "instagram", badge: "whatsapp" },
  },
  {
    id: "priya",
    name: "Priya Sharma",
    preview: "Great, please send the details.",
    time: "9:35 AM",
    channels: ["email"],
    status: "followed_up",
    avatar: { kind: "channel", channel: "email" },
  },
  {
    id: "mark",
    name: "Mark Lewis",
    preview: "Is the offer still available?",
    time: "9:31 AM",
    channels: ["whatsapp"],
    avatar: {
      kind: "initial",
      letter: "M",
      tint: "#F8E7A2",
      ink: "#8D6B12",
      badge: "whatsapp",
    },
  },
  {
    id: "aisha",
    name: "Aisha Bello",
    preview: "Okay, thank you!",
    time: "Yesterday",
    channels: [],
    avatar: { kind: "initial", letter: "A", tint: "#C9EBD8", ink: "#1F7A4D" },
  },
  {
    id: "ryan",
    name: "Ryan Thompson",
    preview: "Can we schedule a call?",
    time: "Yesterday",
    channels: ["instagram"],
    status: "your_turn",
    showTurnNote: true,
    avatar: {
      kind: "initial",
      letter: "R",
      tint: "#E6E7EB",
      ink: "#5F6670",
      badge: "instagram",
    },
  },
];

/** Customer lines the hot-buyer scorer reads in demo mode. The preview is the latest one. */
export const demoInbound: Record<string, string[]> = {
  tunde: ["Abeg how much last?", "I go take 2. Send account."],
  sarah: ["Thanks! That works perfectly."],
  james: ["Hi, is the blue one still there?", "Do you have it in blue and size 10?"],
  priya: ["Great, please send the details."],
  mark: ["Is the offer still available?"],
  aisha: ["Okay, thank you!"],
  ryan: ["Can we schedule a call?"],
};

export function demoChats(): Chat[] {
  return chats.map((chat) => {
    const inbound = demoInbound[chat.id] ?? [chat.preview];
    const hot = scoreBuyingIntent(inbound).hot || chat.status === "hot";
    const handled = chat.status === "answered" || chat.status === "followed_up";
    return {
      ...chat,
      hot,
      status: hot && !handled ? "hot" : chat.status,
    };
  });
}

export function demoBuyers(): Chat[] {
  return demoChats().filter((chat) => chat.hot);
}

export const channelTotals: { channel: Channel; label: string; count: number }[] =
  [
    { channel: "whatsapp", label: "WhatsApp", count: 24 },
    { channel: "instagram", label: "Instagram", count: 12 },
    { channel: "email", label: "Email", count: 6 },
  ];

export const channelFilters: { id: Channel; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "email", label: "Email" },
];

export const assistantPrompts = [
  {
    id: "who",
    label: "Who should I talk to?",
    reply:
      "Start with Tunde Adeyemi. They asked how much last, said they will take 2, and want the account. James Carter wants it in blue, size 10. Mark Lewis is checking whether the offer is still available. Ryan Thompson wants to schedule a call.",
  },
  {
    id: "today",
    label: "How was today?",
    reply: "I handled 42 chats today. 3 buyers are ready for you.",
  },
  {
    id: "draft",
    label: "Draft a reply to James",
    reply:
      "Hi James! Yes, we have it in blue, size 10. I can set one aside for you. Want me to?",
  },
];

export function channelLabel(channel: Channel) {
  if (channel === "whatsapp") return "WhatsApp";
  if (channel === "instagram") return "Instagram";
  return "Email";
}
