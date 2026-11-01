import type { Metadata } from "next";
import { InboxScreen } from "@/components/inbox-screen";
import { loadAssistantHome } from "@/lib/db/assistant";
import { loadBusinessProfile, shopFacts } from "@/lib/db/profile";
import { loadWorkspace } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function InboxPage() {
  const [workspace, profile, assistant] = await Promise.all([
    loadWorkspace(),
    loadBusinessProfile(),
    loadAssistantHome(),
  ]);
  const shop = shopFacts(profile);
  return (
    <InboxScreen
      chats={workspace.chats}
      summary={workspace.summary}
      source={workspace.source}
      notice={workspace.notice}
      whatsappConnected={workspace.whatsappConnected}
      whatsappAutoReply={workspace.whatsappAutoReply}
      businessName={shop?.business_name ?? null}
      checkIn={assistant.checkIn}
      handlingMode={assistant.mode}
    />
  );
}
