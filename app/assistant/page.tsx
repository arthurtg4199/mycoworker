import type { Metadata } from "next";
import { connection } from "next/server";
import { CoworkerChat } from "@/components/coworker-chat";
import { getAuthUser } from "@/lib/auth";
import { assistantIntro } from "@/lib/business-profile";
import { coworkerContextFromWorkspace } from "@/lib/coworker-chat";
import { loadAssistantHome } from "@/lib/db/assistant";
import {
  listCoworkerMessages,
  missingCoworkerTable,
} from "@/lib/db/coworker";
import { liveAssistantPrompts, type WorkspaceView } from "@/lib/db/inbox";
import { loadBusinessProfile, shopFacts } from "@/lib/db/profile";
import { DatabaseQueryError, loadWorkspace } from "@/lib/db/queries";
import { assistantPrompts } from "@/lib/demo-data";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Talk to MyCoWorker",
};

async function savedThread() {
  if (!getSupabaseEnv()) return { messages: [], notice: null as string | null };
  const user = await getAuthUser();
  if (!user) return { messages: [], notice: null };
  try {
    await connection();
    return { messages: await listCoworkerMessages(), notice: null };
  } catch (error) {
    if (missingCoworkerTable(error)) {
      return {
        messages: [],
        notice: "This chat stays on this screen until the coworker table is added.",
      };
    }
    console.error(
      "MyCoWorker could not load the coworker chat.",
      error instanceof DatabaseQueryError ? error.message : error,
    );
    return {
      messages: [],
      notice: "I could not open our saved chat yet. A new message still works.",
    };
  }
}

function introFor(
  workspace: WorkspaceView,
  shop: ReturnType<typeof shopFacts>,
) {
  if (shop) return assistantIntro(shop);
  if (workspace.source === "live") {
    return "Ask me about the chats I can see. I can point you to who needs you, or draft a reply.";
  }
  return "Ask me about today. I only know the sample inbox for now.";
}

export default async function AssistantPage() {
  const [workspace, profile, assistant, thread] = await Promise.all([
    loadWorkspace(),
    loadBusinessProfile(),
    loadAssistantHome(),
    savedThread(),
  ]);
  const shop = shopFacts(profile);
  const live = workspace.source === "live";
  const prompts = live ? liveAssistantPrompts(workspace, shop) : assistantPrompts;

  return (
    <CoworkerChat
      initialMessages={thread.messages}
      loadNotice={thread.notice}
      intro={introFor(workspace, shop)}
      prompts={prompts.map((prompt) => ({ id: prompt.id, label: prompt.label }))}
      context={coworkerContextFromWorkspace(workspace, shop, assistant.mode)}
      checkIn={assistant.checkIn}
      handlingMode={assistant.mode}
    />
  );
}
