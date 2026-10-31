import { AppChrome } from "@/components/app-chrome";
import { AuthScreen } from "@/components/auth-screen";
import { PaAvatarProvider } from "@/components/pa-preference";
import { SessionProvider } from "@/components/session";
import { getAuthUser } from "@/lib/auth";
import { liveHighlights } from "@/lib/db/inbox";
import { loadWorkspace } from "@/lib/db/queries";
import { supabaseConfigStatus } from "@/lib/supabase/env";

export function RootFrame({ children }: { children: React.ReactNode }) {
  const status = supabaseConfigStatus();

  if (status === "demo") {
    return (
      <SessionProvider value={{ demoMode: true, email: null }}>
        <PaAvatarProvider>
          <AppChrome>{children}</AppChrome>
        </PaAvatarProvider>
      </SessionProvider>
    );
  }

  if (status === "incomplete") {
    return <AuthScreen setup="incomplete" />;
  }

  return <AuthedFrame>{children}</AuthedFrame>;
}

async function AuthedFrame({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();

  if (!user) {
    return <AuthScreen />;
  }

  const workspace = await loadWorkspace();
  const sampleChats = workspace.source === "demo";

  return (
    <SessionProvider value={{ demoMode: false, email: user.email }}>
      <PaAvatarProvider>
        <AppChrome
          sampleChats={sampleChats}
          whatsappConnected={workspace.whatsappConnected}
          highlights={sampleChats ? null : liveHighlights(workspace)}
        >
          {children}
        </AppChrome>
      </PaAvatarProvider>
    </SessionProvider>
  );
}
