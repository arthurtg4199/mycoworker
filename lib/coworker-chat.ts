import { handlingModeCopy, type HandlingMode } from "@/lib/assistant-mode";
import {
  draftCustomerReply,
  type ReplyTone,
} from "@/lib/business-profile";
import type { WorkspaceView } from "@/lib/db/inbox";
import type { ShopFacts } from "@/lib/db/profile";

export type CoworkerRole = "owner" | "assistant";

export type CoworkerTurn = {
  id: string;
  role: CoworkerRole;
  content: string;
  createdAt: string;
};

export type CoworkerInboxKind = "demo" | "sample" | "live" | "unavailable";

export type CoworkerShop = {
  business_name: string;
  what_they_sell: string | null;
  hours: string | null;
  location: string | null;
  reply_tone: ReplyTone;
};

export type CoworkerPerson = {
  name: string;
  preview: string;
};

export type CoworkerContext = {
  shop: CoworkerShop | null;
  summary: { chatsHandled: number; buyersReady: number };
  people: CoworkerPerson[];
  handlingMode: HandlingMode;
  inbox: CoworkerInboxKind;
};

export const COWORKER_CHAT_STORAGE_KEY = "mycoworker.coworker-chat";
const CHANGE_EVENT = "mycoworker-coworker-chat";
const CONTENT_LIMIT = 2000;
const EMPTY_TURNS: CoworkerTurn[] = [];

let storedCache: CoworkerTurn[] = EMPTY_TURNS;
let storedRaw: string | null = null;

export function coworkerContent(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length > CONTENT_LIMIT) return text.slice(0, CONTENT_LIMIT);
  return text;
}

export function coworkerContextFromWorkspace(
  workspace: WorkspaceView,
  shop: ShopFacts | null,
  mode: HandlingMode,
): CoworkerContext {
  const waiting =
    workspace.buyers.length > 0
      ? workspace.buyers
      : workspace.chats.filter(
          (chat) => chat.status === "hot" || chat.status === "your_turn",
        );
  let inbox: CoworkerInboxKind = "live";
  if (workspace.source === "demo" && workspace.notice) inbox = "sample";
  else if (workspace.source === "demo") inbox = "demo";
  else if (workspace.notice && workspace.chats.length === 0) inbox = "unavailable";

  return {
    shop: shop
      ? {
          business_name: shop.business_name,
          what_they_sell: shop.what_they_sell,
          hours: shop.hours,
          location: shop.location,
          reply_tone: shop.reply_tone,
        }
      : null,
    summary: workspace.summary,
    people: waiting.slice(0, 4).map((person) => ({
      name: person.name,
      preview: person.preview,
    })),
    handlingMode: mode,
    inbox,
  };
}

function isTurn(value: unknown): value is CoworkerTurn {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    record.id.length < 80 &&
    (record.role === "owner" || record.role === "assistant") &&
    typeof record.content === "string" &&
    record.content.trim().length > 0 &&
    record.content.length <= CONTENT_LIMIT &&
    typeof record.createdAt === "string"
  );
}

export function readStoredCoworkerChat(): CoworkerTurn[] {
  try {
    const raw = window.localStorage.getItem(COWORKER_CHAT_STORAGE_KEY);
    if (raw === storedRaw) return storedCache;
    storedRaw = raw;
    if (!raw) {
      storedCache = EMPTY_TURNS;
      return storedCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    storedCache = Array.isArray(parsed)
      ? parsed.filter(isTurn).slice(-80)
      : EMPTY_TURNS;
    return storedCache;
  } catch {
    return storedCache;
  }
}

export function writeStoredCoworkerChat(turns: CoworkerTurn[]) {
  const next = turns.filter(isTurn).slice(-80);
  const raw = JSON.stringify(next);
  storedCache = next.length === 0 ? EMPTY_TURNS : next;
  storedRaw = raw;
  try {
    window.localStorage.setItem(COWORKER_CHAT_STORAGE_KEY, raw);
  } catch {
    // This tab still holds the thread in memory.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeCoworkerChat(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function emptyCoworkerChat() {
  return EMPTY_TURNS;
}

function clip(value: string, max: number) {
  const line = value.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function countPhrase(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function shopName(context: CoworkerContext) {
  return context.shop?.business_name.trim() || null;
}

function sampleNote(context: CoworkerContext) {
  if (context.inbox === "sample") {
    return " These names are sample chats until a real inbox is connected.";
  }
  if (context.inbox === "unavailable") {
    return " I could not open the saved inbox just now.";
  }
  return "";
}

function peopleLine(context: CoworkerContext) {
  if (context.people.length === 0) {
    return context.inbox === "live"
      ? "Nobody is waiting on you right now."
      : "Nobody in this inbox is waiting on you right now.";
  }
  return context.people
    .slice(0, 3)
    .map((person) => `${person.name}: ${clip(person.preview, 90)}`)
    .join(" ");
}

function findPerson(text: string, context: CoworkerContext) {
  const haystack = text.toLowerCase();
  return context.people.find((person) => {
    const name = person.name.toLowerCase();
    const given = firstName(person.name).toLowerCase();
    return haystack.includes(name) || (given.length > 2 && haystack.includes(given));
  });
}

function todayLine(context: CoworkerContext) {
  const handled = countPhrase(context.summary.chatsHandled, "chat", "chats");
  const ready = countPhrase(context.summary.buyersReady, "buyer is", "buyers are");
  return `I handled ${handled} today. ${ready} ready for you.`;
}

function draftFor(person: CoworkerPerson, context: CoworkerContext) {
  const shop = shopName(context);
  const tone = context.shop?.reply_tone ?? "friendly";
  if (!shop) {
    return `Hi ${firstName(person.name)}! I can help with “${clip(person.preview, 120)}” Send it from the inbox when you want it to go out.`;
  }
  return draftCustomerReply({
    tone,
    firstName: firstName(person.name),
    businessName: shop,
    preview: clip(person.preview, 140),
  });
}

function whoReply(context: CoworkerContext) {
  if (context.people.length === 0) {
    const shop = shopName(context);
    const where = shop ? ` for ${shop}` : "";
    return `Nobody needs you${where} right now. New customer chats show up in the inbox, and I'll still be here.${sampleNote(context)}`;
  }
  const first = context.people[0]!;
  return `${peopleLine(context)} Start with ${first.name}.${sampleNote(context)}`;
}

function draftReply(text: string, context: CoworkerContext) {
  const named = findPerson(text, context) ?? context.people[0];
  if (!named) {
    return "Nobody is waiting, so I don't have a reply to draft. When a customer messages, I'll write one here and you send it from the inbox.";
  }
  return `${draftFor(named, context)} Nothing goes out until you send it from the inbox.`;
}

function shopFact(
  label: string,
  value: string | null | undefined,
  empty: string,
) {
  const trimmed = value?.trim();
  if (!trimmed) return empty;
  return `${label} ${trimmed}.`;
}

function handlingReply(context: CoworkerContext) {
  return handlingModeCopy(context.handlingMode).stance;
}

function say(text: string) {
  if (text.length <= 1800) return text;
  return `${text.slice(0, 1799)}…`;
}

function buildLocalCoworkerReply(
  raw: string,
  history: CoworkerTurn[],
  context: CoworkerContext,
) {
  const text = coworkerContent(raw) ?? "";
  const lower = text.toLowerCase();
  const shop = shopName(context);
  const previousOwner = [...history]
    .reverse()
    .find((turn) => turn.role === "owner");
  if (
    previousOwner &&
    previousOwner.content.toLowerCase() === lower &&
    history.some((turn) => turn.role === "assistant")
  ) {
    return "That's the same note as just now. Scroll up for what I said, or ask me who needs you, how today went, or for a draft.";
  }

  const lastAssistant = [...history].reverse().find((turn) => turn.role === "assistant");

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(lower)) {
    const place = shop ? ` I'm looking after ${shop}.` : "";
    return `Hi. I'm here.${place} Ask me who needs you, how today went, or for a draft. Customer messages stay in the inbox.`;
  }

  if (
    /who (should|do) i|who needs|who(?:'s| is) waiting|who first|who'?s next/.test(
      lower,
    )
  ) {
    return whoReply(context);
  }

  if (/how (was|is|'s) today|how many chats|summary|recap/.test(lower)) {
    const extra = context.people[0]
      ? ` Next up is ${context.people[0].name}.`
      : "";
    return `${todayLine(context)}${extra}${sampleNote(context)}`;
  }

  if (/draft|what should i say|reply to|write back|respond to/.test(lower)) {
    return draftReply(text, context);
  }

  if (/hours|what time|when are we open|open today|closing/.test(lower)) {
    return shopFact(
      shop ? `${shop} is open` : "Hours are",
      context.shop?.hours,
      "I don't have hours yet. Add them in Settings and I'll use them next time.",
    );
  }

  if (/where|location|address|which city|what city/.test(lower)) {
    return shopFact(
      shop ? `${shop} is in` : "The shop is in",
      context.shop?.location,
      "I don't have a city yet. Add it in Settings and I'll remember.",
    );
  }

  if (/what (do|are) (we|you|i) sell|what we sell|products/.test(lower)) {
    return shopFact(
      shop ? `${shop} sells` : "You sell",
      context.shop?.what_they_sell,
      "I don't have what you sell yet. Add it in Settings and I'll talk about it properly.",
    );
  }

  if (/paused|auto-?reply|ask me first|handling|are you on/.test(lower)) {
    return handlingReply(context);
  }

  if (/thank/.test(lower)) {
    return "Anytime. I'll stay here while you close the deals.";
  }

  if (/help|what can you|what do you do/.test(lower)) {
    return "I can point you to who needs you, recap today, or draft a reply. I don't message customers from this chat. You send those from the inbox.";
  }

  const named = findPerson(text, context);
  if (named) {
    return `${named.name} said “${clip(named.preview, 120)}” ${draftFor(named, context)}`;
  }

  if (lastAssistant && /i heard you/i.test(lastAssistant.content)) {
    return "Still with you. Ask who needs you, how today went, or for a draft, and I'll take that.";
  }

  const lead = context.people[0]
    ? `${context.people[0].name} is the one I'd look at next (${clip(context.people[0].preview, 80)}).`
    : "Nothing in the inbox needs you right now.";
  const paused =
    context.handlingMode === "paused"
      ? " I'm paused, so I won't handle customer chats until you turn me back on."
      : "";
  return `I heard you. ${lead}${paused} I can recap today or draft a reply. Nothing leaves this chat until you send it from the inbox.${sampleNote(context)}`;
}

export function localCoworkerReply(
  raw: string,
  history: CoworkerTurn[],
  context: CoworkerContext,
) {
  return say(buildLocalCoworkerReply(raw, history, context));
}
