"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { markEveryNudgeRead, markNudgeRead } from "@/lib/db/assistant";
import { DatabaseQueryError } from "@/lib/db/queries";
import { assertId } from "@/lib/db/validate";

async function owner() {
  const user = await getAuthUser();
  if (!user) return null;
  return user;
}

export async function markNudgeReadAction(id: string): Promise<{ ok: boolean }> {
  if (!(await owner())) return { ok: false };
  try {
    await markNudgeRead(assertId(id, "Nudge"));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error(
      "MyCoWorker could not mark a nudge read.",
      error instanceof DatabaseQueryError ? error.message : error,
    );
    return { ok: false };
  }
}

export async function markAllNudgesReadAction(): Promise<{ ok: boolean }> {
  if (!(await owner())) return { ok: false };
  try {
    await markEveryNudgeRead();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    console.error(
      "MyCoWorker could not mark nudges read.",
      error instanceof DatabaseQueryError ? error.message : error,
    );
    return { ok: false };
  }
}
