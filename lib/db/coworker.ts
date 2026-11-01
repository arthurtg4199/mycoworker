import type { PostgrestError } from "@supabase/supabase-js";
import {
  coworkerContent,
  type CoworkerRole,
  type CoworkerTurn,
} from "@/lib/coworker-chat";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
} from "@/lib/db/queries";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const columns = "id, role, content, created_at";

function throwQuery(error: PostgrestError): never {
  throw new DatabaseQueryError(error.message, error.code);
}

export function missingCoworkerTable(error: unknown) {
  return (
    error instanceof DatabaseQueryError &&
    (error.code === "42P01" || error.code === "PGRST205")
  );
}

async function database() {
  if (!getSupabaseEnv()) throw new DatabaseNotConfiguredError();
  return createClient();
}

function turnFromRow(row: {
  id: string;
  role: string;
  content: string;
  created_at: string;
}): CoworkerTurn | null {
  if (row.role !== "owner" && row.role !== "assistant") return null;
  const content = coworkerContent(row.content);
  if (!content) return null;
  return {
    id: row.id,
    role: row.role,
    content,
    createdAt: row.created_at,
  };
}

export async function listCoworkerMessages(): Promise<CoworkerTurn[]> {
  const db = await database();
  const { data, error } = await db
    .from("coworker_messages")
    .select(columns)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throwQuery(error);
  return (data ?? []).flatMap((row) => {
    const turn = turnFromRow(row);
    return turn ? [turn] : [];
  }).reverse();
}

export async function insertCoworkerMessage(
  role: CoworkerRole,
  content: string,
): Promise<CoworkerTurn> {
  const text = coworkerContent(content);
  if (!text) throw new Error("Write a message first.");
  const db = await database();
  const { data, error } = await db
    .from("coworker_messages")
    .insert({ role, content: text })
    .select(columns)
    .single();
  if (error) throwQuery(error);
  const turn = data ? turnFromRow(data) : null;
  if (!turn) {
    throw new DatabaseQueryError("The database did not return a row.", "PGRST116");
  }
  return turn;
}
