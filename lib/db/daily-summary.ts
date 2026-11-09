import { cache } from "react";
import { DatabaseNotConfiguredError, DatabaseQueryError } from "@/lib/db/queries";
import { chats } from "@/lib/demo-data";
import { demoNudgeViews } from "@/lib/nudges";
import {
  countsFromSampleChats,
  summarizeCounts,
  unavailableDailySummary,
  utcDayWindow,
  type DailySummary,
} from "@/lib/daily-summary";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;
type CountTable = "chats" | "messages" | "nudges";

function demoDailySummary(): DailySummary {
  return summarizeCounts(
    countsFromSampleChats(chats, demoNudgeViews().length),
    "demo",
  );
}

async function countCreatedToday(
  db: Db,
  table: CountTable,
  start: string,
  end: string,
) {
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) throw new DatabaseQueryError(error.message, error.code);
  return count ?? 0;
}

/**
 * Today's new chats, messages, and nudges.
 * An empty Supabase env stays on the sample inbox instead of throwing.
 */
export const loadDailySummary = cache(async (): Promise<DailySummary> => {
  if (!getSupabaseEnv()) return demoDailySummary();

  try {
    const db = await createClient();
    const { start, end } = utcDayWindow(new Date());
    const [newChats, messages, nudges] = await Promise.all([
      countCreatedToday(db, "chats", start, end),
      countCreatedToday(db, "messages", start, end),
      countCreatedToday(db, "nudges", start, end),
    ]);
    return summarizeCounts({ newChats, messages, nudges }, "live");
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return demoDailySummary();
    console.error(
      "MyCoWorker could not load today's summary.",
      error instanceof Error ? error.message : error,
    );
    return unavailableDailySummary();
  }
});
