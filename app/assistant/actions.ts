"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { getHandlingMode } from "@/lib/db/assistant";
import {
  coworkerContent,
  coworkerContextFromWorkspace,
  type CoworkerTurn,
} from "@/lib/coworker-chat";
import { coworkerReply } from "@/lib/coworker-gemini";
import {
  insertCoworkerMessage,
  listCoworkerMessages,
  missingCoworkerTable,
} from "@/lib/db/coworker";
import {
  DatabaseNotConfiguredError,
  DatabaseQueryError,
  loadWorkspace,
} from "@/lib/db/queries";
import { loadBusinessProfile, shopFacts } from "@/lib/db/profile";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type CoworkerSendResult = {
  ok: boolean;
  message?: string;
  owner?: CoworkerTurn;
  assistant?: CoworkerTurn;
  persisted?: boolean;
  source?: "gemini" | "local";
};

function localTurn(role: CoworkerTurn["role"], content: string): CoworkerTurn {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export async function sendCoworkerMessage(
  raw: string,
): Promise<CoworkerSendResult> {
  const text = coworkerContent(raw);
  if (!text) return { ok: false, message: "Write a message first." };

  if (!getSupabaseEnv()) {
    return {
      ok: false,
      message: "This preview keeps the chat on this device.",
    };
  }

  const user = await getAuthUser();
  if (!user) {
    return { ok: false, message: "Sign in to talk to MyCoWorker." };
  }

  try {
    const [workspace, profile, mode, history] = await Promise.all([
      loadWorkspace(),
      loadBusinessProfile(),
      getHandlingMode().catch(() => "ask_first" as const),
      listCoworkerMessages().catch((error: unknown) => {
        if (missingCoworkerTable(error)) return [] as CoworkerTurn[];
        throw error;
      }),
    ]);
    const context = coworkerContextFromWorkspace(
      workspace,
      shopFacts(profile),
      mode,
    );
    const reply = await coworkerReply(text, history, context);

    try {
      const owner = await insertCoworkerMessage("owner", text);
      const assistant = await insertCoworkerMessage("assistant", reply.text);
      revalidatePath("/assistant");
      return {
        ok: true,
        owner,
        assistant,
        persisted: true,
        source: reply.source,
      };
    } catch (error) {
      if (
        error instanceof DatabaseNotConfiguredError ||
        missingCoworkerTable(error)
      ) {
        return {
          ok: true,
          persisted: false,
          source: reply.source,
          owner: localTurn("owner", text),
          assistant: localTurn("assistant", reply.text),
          message:
            "I replied, but this chat is not saved to your account yet.",
        };
      }
      throw error;
    }
  } catch (error) {
    console.error(
      "MyCoWorker could not reply in the coworker chat.",
      error instanceof DatabaseQueryError ? error.message : error,
    );
    return {
      ok: false,
      message: "I could not answer that just now. Try again.",
    };
  }
}
