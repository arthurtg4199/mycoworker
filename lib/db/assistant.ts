import { cache } from "react";
import { connection } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  isHandlingMode,
  type HandlingMode,
} from "@/lib/assistant-mode";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
  loadWorkspace,
} from "@/lib/db/queries";
import type { WorkspaceView } from "@/lib/db/inbox";
import { assertId } from "@/lib/db/validate";
import {
  checkInFromSignals,
  demoNudgeViews,
  draftsForSignals,
  emptyCheckIn,
  isNudgeType,
  liveNudgeEmpty,
  sampleNudgeEmpty,
  type DailyCheckIn,
  type NudgeDraft,
  type NudgeView,
} from "@/lib/nudges";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AssistantHome = {
  mode: HandlingMode;
  nudges: NudgeView[];
  checkIn: DailyCheckIn;
  emptyCopy: string;
  notice: string | null;
};

const settingsColumns = "handling_mode";
const nudgeColumns =
  "id, type, title, body, dedupe_key, read_at, created_at";

function throwQuery(error: PostgrestError): never {
  throw new DatabaseQueryError(error.message, error.code);
}

function missingTable(error: unknown) {
  return (
    error instanceof DatabaseQueryError &&
    (error.code === "42P01" || error.code === "PGRST205")
  );
}

async function database() {
  if (!getSupabaseEnv()) throw new DatabaseNotConfiguredError();
  return createClient();
}

function nudgeKind(workspace: WorkspaceView) {
  if (workspace.source === "demo" && workspace.notice) return "sample" as const;
  if (workspace.source === "demo") return "demo" as const;
  if (workspace.notice && workspace.chats.length === 0) return "unavailable" as const;
  return "live" as const;
}

export async function getHandlingMode(): Promise<HandlingMode> {
  const db = await database();
  const { data, error } = await db
    .from("assistant_settings")
    .select(settingsColumns)
    .maybeSingle();
  if (error) throwQuery(error);
  return data && isHandlingMode(data.handling_mode) ? data.handling_mode : "ask_first";
}

export async function upsertHandlingMode(userId: string, mode: HandlingMode) {
  if (!isHandlingMode(mode)) {
    throw new Error("That handling mode is not valid.");
  }
  const db = await database();
  const { error } = await db.from("assistant_settings").upsert(
    { user_id: assertId(userId, "Account"), handling_mode: mode },
    { onConflict: "user_id" },
  );
  if (error) throwQuery(error);
}

function viewFromRow(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}): NudgeView | null {
  if (!isNudgeType(row.type)) return null;
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    read: Boolean(row.read_at),
    createdAt: row.created_at,
  };
}

async function listNudgeRows() {
  const db = await database();
  const { data, error } = await db
    .from("nudges")
    .select(nudgeColumns)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throwQuery(error);
  return (data ?? []).flatMap((row) => {
    const view = viewFromRow(row);
    return view ? [view] : [];
  });
}

async function ensureNudges(drafts: NudgeDraft[]) {
  if (drafts.length === 0) return;
  const db = await database();
  const keys = drafts.map((draft) => draft.dedupe_key);
  const { data, error } = await db
    .from("nudges")
    .select("id, dedupe_key, read_at, body")
    .in("dedupe_key", keys);
  if (error) throwQuery(error);
  const existing = new Map((data ?? []).map((row) => [row.dedupe_key, row]));
  const missing = drafts.filter((draft) => !existing.has(draft.dedupe_key));
  if (missing.length > 0) {
    const { error: insertError } = await db.from("nudges").insert(
      missing.map((draft) => ({
        type: draft.type,
        title: draft.title,
        body: draft.body,
        customer_id: draft.customer_id,
        chat_id: draft.chat_id,
        dedupe_key: draft.dedupe_key,
      })),
    );
    if (insertError && insertError.code !== "23505") throwQuery(insertError);
  }

  const daily = drafts.find((draft) => draft.type === "daily_check_in");
  const saved = daily ? existing.get(daily.dedupe_key) : undefined;
  if (daily && saved && !saved.read_at && saved.body !== daily.body) {
    const { error: updateError } = await db
      .from("nudges")
      .update({ title: daily.title, body: daily.body })
      .eq("id", saved.id);
    if (updateError) throwQuery(updateError);
  }
}

export async function markNudgeRead(id: string) {
  const db = await database();
  const { error } = await db
    .from("nudges")
    .update({ read_at: new Date().toISOString() })
    .eq("id", assertId(id, "Nudge"))
    .is("read_at", null);
  if (error) throwQuery(error);
}

export async function markEveryNudgeRead() {
  const db = await database();
  const { error } = await db
    .from("nudges")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throwQuery(error);
}

async function readMode(): Promise<HandlingMode> {
  if (!getSupabaseEnv()) return "ask_first";
  try {
    return await getHandlingMode();
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError || missingTable(error)) {
      return "ask_first";
    }
    console.error(
      "MyCoWorker could not load the handling mode.",
      error instanceof Error ? error.message : error,
    );
    return "ask_first";
  }
}

export const loadAssistantHome = cache(async (): Promise<AssistantHome> => {
  const [workspace, mode] = await Promise.all([loadWorkspace(), readMode()]);
  const kind = nudgeKind(workspace);

  if (kind === "demo") {
    return {
      mode,
      nudges: demoNudgeViews(),
      checkIn: checkInFromSignals(workspace.signals),
      emptyCopy: liveNudgeEmpty,
      notice: null,
    };
  }

  if (kind === "sample") {
    return {
      mode,
      nudges: [],
      checkIn: emptyCheckIn(sampleNudgeEmpty),
      emptyCopy: sampleNudgeEmpty,
      notice: null,
    };
  }

  if (kind === "unavailable") {
    const quiet = "I could not look through today's chats yet. Refresh in a moment.";
    return {
      mode,
      nudges: [],
      checkIn: emptyCheckIn(quiet),
      emptyCopy: quiet,
      notice: quiet,
    };
  }

  const checkIn = checkInFromSignals(workspace.signals);
  const hasChats = workspace.chats.length > 0 || workspace.signals.length > 0;
  try {
    if (hasChats) {
      await connection();
      await ensureNudges(draftsForSignals(workspace.signals, new Date()));
    }
    return {
      mode,
      nudges: await listNudgeRows(),
      checkIn,
      emptyCopy: liveNudgeEmpty,
      notice: null,
    };
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return {
        mode: "ask_first",
        nudges: demoNudgeViews(),
        checkIn: checkInFromSignals(workspace.signals),
        emptyCopy: liveNudgeEmpty,
        notice: null,
      };
    }
    console.error(
      "MyCoWorker could not load nudges.",
      error instanceof Error ? error.message : error,
    );
    const quiet = "I could not open your nudges yet. Refresh in a moment.";
    return {
      mode,
      nudges: [],
      checkIn,
      emptyCopy: quiet,
      notice: quiet,
    };
  }
});
