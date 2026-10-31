import type { Metadata } from "next";
import { InboxScreen } from "@/components/inbox-screen";
import { loadBusinessProfile, shopFacts } from "@/lib/db/profile";
import { loadWorkspace } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function InboxPage() {
  const [workspace, profile] = await Promise.all([
    loadWorkspace(),
    loadBusinessProfile(),
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
    />
  );
}
