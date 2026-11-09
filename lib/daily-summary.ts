export const coworkerTagline = "I handle the chats. You close the deals.";

export type DailySummarySource = "demo" | "live" | "unavailable";

export type DailyCounts = {
  newChats: number;
  messages: number;
  nudges: number;
};

export type DailySummary = DailyCounts & {
  line: string;
  source: DailySummarySource;
};

const dayMs = 86_400_000;
const countCap = 1_000_000;

export function normalizeCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), countCap);
}

export function normalizeDailyCounts(counts: DailyCounts): DailyCounts {
  return {
    newChats: normalizeCount(counts.newChats),
    messages: normalizeCount(counts.messages),
    nudges: normalizeCount(counts.nudges),
  };
}

/** UTC midnight, matching the inbox's "today" window. */
export function startOfUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function utcDayWindow(now: Date) {
  const start = startOfUtcDay(now);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + dayMs).toISOString(),
  };
}

export function isCreatedOnUtcDay(iso: string, now: Date) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return false;
  const start = startOfUtcDay(now).getTime();
  return time >= start && time < start + dayMs;
}

export function countCreatedOnUtcDay(rows: { createdAt: string }[], now: Date) {
  return rows.reduce(
    (total, row) => total + (isCreatedOnUtcDay(row.createdAt, now) ? 1 : 0),
    0,
  );
}

/** Sample chats use a clock time for today and the word Yesterday otherwise. */
export function isSampleChatToday(time: string) {
  return time.trim().toLowerCase() !== "yesterday";
}

export function countsFromSampleChats(
  sample: { time: string; preview: string }[],
  nudgeCount: number,
): DailyCounts {
  const todays = sample.filter((chat) => isSampleChatToday(chat.time));
  return normalizeDailyCounts({
    newChats: todays.length,
    messages: todays.filter((chat) => chat.preview.trim().length > 0).length,
    nudges: nudgeCount,
  });
}

function withTagline(lead: string) {
  return `${lead} ${coworkerTagline}`;
}

/** Short line in the product voice. Rules only: no model, no key. */
export function dailySummaryLine(counts: DailyCounts) {
  const { newChats, messages, nudges } = normalizeDailyCounts(counts);
  if (newChats === 0 && messages === 0 && nudges === 0) {
    return withTagline("Nothing new yet.");
  }
  if (newChats > 0 && nudges > 0) {
    return withTagline("New chats are in.");
  }
  if (nudges === 1) return withTagline("One nudge is waiting.");
  if (nudges > 1) return withTagline(`${nudges} nudges are waiting.`);
  if (newChats === 0 && messages > 0) {
    return withTagline("I kept the chats moving.");
  }
  return coworkerTagline;
}

export function summarizeCounts(
  counts: DailyCounts,
  source: Exclude<DailySummarySource, "unavailable">,
): DailySummary {
  const normalized = normalizeDailyCounts(counts);
  return {
    ...normalized,
    line: dailySummaryLine(normalized),
    source,
  };
}

export function unavailableDailySummary(): DailySummary {
  return {
    newChats: 0,
    messages: 0,
    nudges: 0,
    line: "I could not count today's chats yet. Refresh in a moment.",
    source: "unavailable",
  };
}
