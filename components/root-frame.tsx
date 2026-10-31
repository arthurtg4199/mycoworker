import { AppChrome } from "@/components/app-chrome";
import { AuthScreen } from "@/components/auth-screen";
import { PaAvatarProvider } from "@/components/pa-preference";
import { SessionProvider } from "@/components/session";
import { getAuthUser } from "@/lib/auth";
import { liveHighlights } from "@/lib/db/inbox";
import { loadBusinessProfile, shopFacts } from "@/lib/db/profile";
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

  const [workspace, profile] = await Promise.all([
    loadWorkspace(),
    loadBusinessProfile(),
  ]);
  const sampleChats = workspace.source === "demo";
  const shop = shopFacts(profile);

  return (
    <SessionProvider value={{ demoMode: false, email: user.email }}>
      <PaAvatarProvider>
        <AppChrome
          sampleChats={sampleChats}
          whatsappConnected={workspace.whatsappConnected}
          highlights={sampleChats ? null : liveHighlights(workspace)}
          shop={
            shop
              ? { name: shop.business_name, location: shop.location }
              : null
          }
        >
          {children}
        </AppChrome>
      </PaAvatarProvider>
    </SessionProvider>
  );
}
