import type { HandlingMode } from "@/lib/assistant-mode";
import { handlingModeCopy } from "@/lib/assistant-mode";
import type { ConversationStatus } from "@/lib/db/types";
import { chats, type ChatStatus } from "@/lib/demo-data";

export const nudgeTypes = [
  "hot_buyer",
  "follow_up",
  "daily_check_in",
  "unanswered",
] as const;

export type NudgeType = (typeof nudgeTypes)[number];

export type ChatSignal = {
  chatId: string | null;
  customerId: string | null;
  name: string;
  preview: string;
  status: ConversationStatus;
  readyToClose: boolean;
};

export type NudgeDraft = {
  type: NudgeType;
  title: string;
  body: string;
  customer_id: string | null;
  chat_id: string | null;
  dedupe_key: string;
};

export type NudgeView = {
  id: string;
  type: NudgeType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type CheckInLine = {
  id: string;
  type: NudgeType;
  text: string;
};

export type DailyCheckIn = {
  title: string;
  lines: CheckInLine[];
  quiet: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const perTypeCap = 8;

const demoReady = new Set(["james", "mark"]);

export const sampleNudgeEmpty =
  "Nudges appear when chats are connected. Nothing is waiting on you yet.";

export const liveNudgeEmpty =
  "Nudges show up when a customer needs you. Nothing is waiting right now.";

export function nudgeTypeLabel(type: NudgeType) {
  if (type === "hot_buyer") return "Hot buyer";
  if (type === "follow_up") return "Follow-up";
  if (type === "daily_check_in") return "Morning check-in";
  return "Unanswered";
}

export function isNudgeType(value: string): value is NudgeType {
  return nudgeTypes.some((type) => type === value);
}

export function utcDay(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function handlingStance(mode: HandlingMode) {
  return handlingModeCopy(mode).stance;
}

function clipPreview(value: string) {
  const line = value.replace(/\s+/g, " ").trim();
  if (!line || line === "No messages yet.") return "They reached out.";
  if (line.length <= 90) return line;
  return `${line.slice(0, 89)}…`;
}

function clipTitle(value: string) {
  const line = value.replace(/\s+/g, " ").trim();
  if (line.length <= 140) return line;
  return `${line.slice(0, 139)}…`;
}

function uuidOrNull(value: string | null) {
  if (!value || !uuidPattern.test(value)) return null;
  return value;
}

function demoStatus(status: ChatStatus | undefined): ConversationStatus {
  if (
    status === "answered" ||
    status === "hot" ||
    status === "followed_up" ||
    status === "your_turn"
  ) {
    return status;
  }
  return "open";
}

/** Sample inbox signals. James and Mark are ready, Ryan is waiting, Priya needs a follow-up. */
export function demoSignals(): ChatSignal[] {
  return chats.map((chat) => ({
    chatId: chat.id,
    customerId: chat.id,
    name: chat.name,
    preview: chat.preview,
    status: demoStatus(chat.status),
    readyToClose: demoReady.has(chat.id),
  }));
}

export function classifySignal(signal: ChatSignal): Exclude<NudgeType, "daily_check_in"> | null {
  if (signal.status === "hot" || signal.readyToClose) return "hot_buyer";
  if (signal.status === "your_turn") return "unanswered";
  if (signal.status === "followed_up") return "follow_up";
  return null;
}

function titleFor(type: Exclude<NudgeType, "daily_check_in">, name: string) {
  if (type === "hot_buyer") return `${name} is ready to buy`;
  if (type === "unanswered") return `${name} is waiting`;
  return `Follow up with ${name}`;
}

function bodyFor(
  type: Exclude<NudgeType, "daily_check_in">,
  name: string,
  preview: string,
) {
  if (type === "hot_buyer") {
    return `${name} looks ready to close. “${preview}” I'll ask you before anyone hears back.`;
  }
  if (type === "unanswered") {
    return `${name} has not been answered. They said: “${preview}”`;
  }
  return `A follow-up would keep ${name} warm. Last note: “${preview}”`;
}

export function signalDrafts(signals: ChatSignal[]): NudgeDraft[] {
  const counts: Record<Exclude<NudgeType, "daily_check_in">, number> = {
    hot_buyer: 0,
    unanswered: 0,
    follow_up: 0,
  };
  const drafts: NudgeDraft[] = [];
  for (const signal of signals) {
    const type = classifySignal(signal);
    if (!type || counts[type] >= perTypeCap) continue;
    const name = signal.name.trim() || "A customer";
    const preview = clipPreview(signal.preview);
    const ref = signal.chatId ?? (signal.customerId ? `customer:${signal.customerId}` : null);
    if (!ref) continue;
    counts[type] += 1;
    drafts.push({
      type,
      title: clipTitle(titleFor(type, name)),
      body: bodyFor(type, name, preview),
      customer_id: uuidOrNull(signal.customerId),
      chat_id: uuidOrNull(signal.chatId),
      dedupe_key: `${type}:${ref}`,
    });
  }
  return drafts;
}

export function dailyDraft(signals: ChatSignal[], day: string): NudgeDraft {
  const lines = signalDrafts(signals).slice(0, 3).map((draft) => draft.title);
  const body = lines.length
    ? `${lines.join(". ")}.`
    : "The inbox is quiet. I'll nudge you when a customer needs you.";
  return {
    type: "daily_check_in",
    title: "Here's what needs you today",
    body,
    customer_id: null,
    chat_id: null,
    dedupe_key: `daily_check_in:${day}`,
  };
}

export function draftsForSignals(signals: ChatSignal[], now: Date): NudgeDraft[] {
  return [dailyDraft(signals, utcDay(now)), ...signalDrafts(signals)];
}

/** Fixed clock so demo nudges can prerender without reading the current time. */
const demoAnchor = Date.UTC(2026, 10, 1, 8, 0, 0);

export function checkInFromSignals(signals: ChatSignal[]): DailyCheckIn {
  const lines = signalDrafts(signals)
    .slice(0, 5)
    .map((draft) => ({
      id: draft.dedupe_key,
      type: draft.type,
      text: draft.title,
    }));
  return {
    title: "Here's what needs you today",
    lines,
    quiet:
      lines.length === 0
        ? "Nothing needs you right now. I'll nudge you when a customer does."
        : null,
  };
}

export function emptyCheckIn(quiet: string): DailyCheckIn {
  return {
    title: "Here's what needs you today",
    lines: [],
    quiet,
  };
}

export function demoNudgeViews(): NudgeView[] {
  const now = new Date(demoAnchor);
  return draftsForSignals(demoSignals(), now).map((draft, index) => ({
    id: draft.dedupe_key,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    read: false,
    createdAt: new Date(now.getTime() - index * 60_000).toISOString(),
  }));
}

export function nudgeTimeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const NUDGE_READS_KEY = "mycoworker.nudge-reads";
const READS_EVENT = "mycoworker-nudge-reads";

let readsSnapshot: string[] = [];
let readsSnapshotRaw: string | null = null;
let readsMemory: string | null = null;

function parseReads(raw: string | null) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string").slice(0, 80);
  } catch {
    return [];
  }
}

export function readStoredNudgeReads(): string[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(NUDGE_READS_KEY);
  } catch {
    raw = readsMemory;
  }
  if (raw === readsSnapshotRaw) return readsSnapshot;
  readsSnapshotRaw = raw;
  readsSnapshot = parseReads(raw);
  return readsSnapshot;
}

export function writeStoredNudgeRead(id: string) {
  const next = Array.from(new Set([...readStoredNudgeReads(), id])).slice(-80);
  const raw = JSON.stringify(next);
  readsMemory = raw;
  readsSnapshotRaw = raw;
  readsSnapshot = next;
  try {
    window.localStorage.setItem(NUDGE_READS_KEY, raw);
    readsMemory = null;
  } catch {
    // This tab still has the read ids in memory.
  }
  window.dispatchEvent(new Event(READS_EVENT));
}

export function writeStoredNudgeReads(ids: string[]) {
  const next = Array.from(new Set(ids.filter((id) => id.length > 0))).slice(-80);
  const raw = JSON.stringify(next);
  readsMemory = raw;
  readsSnapshotRaw = raw;
  readsSnapshot = next;
  try {
    window.localStorage.setItem(NUDGE_READS_KEY, raw);
    readsMemory = null;
  } catch {
    // This tab still has the read ids in memory.
  }
  window.dispatchEvent(new Event(READS_EVENT));
}

export function subscribeNudgeReads(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(READS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(READS_EVENT, onStoreChange);
  };
}
