import type { Metadata } from "next";
import { AssistantScreen } from "@/components/assistant-screen";
import { assistantIntro } from "@/lib/business-profile";
import { loadAssistantHome } from "@/lib/db/assistant";
import { liveAssistantPrompts } from "@/lib/db/inbox";
import { loadBusinessProfile, shopFacts } from "@/lib/db/profile";
import { loadWorkspace } from "@/lib/db/queries";
import { assistantPrompts } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Assistant",
};

export default async function AssistantPage() {
  const [workspace, profile, assistant] = await Promise.all([
    loadWorkspace(),
    loadBusinessProfile(),
    loadAssistantHome(),
  ]);
  const live = workspace.source === "live";
  const shop = shopFacts(profile);
  const intro = shop
    ? assistantIntro(shop)
    : live
      ? "Ask about today. I am looking at your WhatsApp chats."
      : "Ask about today. I only know the sample inbox for now.";
  return (
    <AssistantScreen
      prompts={live ? liveAssistantPrompts(workspace, shop) : assistantPrompts}
      intro={intro}
      checkIn={assistant.checkIn}
      handlingMode={assistant.mode}
    />
  );
}
