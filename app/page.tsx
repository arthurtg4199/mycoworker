import type { Metadata } from "next";
import { InboxScreen } from "@/components/inbox-screen";
import { loadWorkspace } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function InboxPage() {
  const workspace = await loadWorkspace();
  return (
    <InboxScreen
      chats={workspace.chats}
      summary={workspace.summary}
      source={workspace.source}
      notice={workspace.notice}
      whatsappConnected={workspace.whatsappConnected}
      whatsappAutoReply={workspace.whatsappAutoReply}
    />
  );
}
