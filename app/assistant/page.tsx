import type { Metadata } from "next";
import { AssistantScreen } from "@/components/assistant-screen";
import { liveAssistantPrompts } from "@/lib/db/inbox";
import { loadWorkspace } from "@/lib/db/queries";
import { assistantPrompts } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Assistant",
};

export default async function AssistantPage() {
  const workspace = await loadWorkspace();
  const live = workspace.source === "live";
  return (
    <AssistantScreen
      prompts={live ? liveAssistantPrompts(workspace) : assistantPrompts}
      live={live}
    />
  );
}
