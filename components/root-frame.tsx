import { AppChrome } from "@/components/app-chrome";
import { AuthScreen } from "@/components/auth-screen";
import { PaAvatarProvider } from "@/components/pa-preference";
import { SessionProvider } from "@/components/session";
import { getAuthUser } from "@/lib/auth";
import { loadAssistantHome } from "@/lib/db/assistant";
import { loadBusinessProfile, shopFacts } from "@/lib/db/profile";
import { loadWorkspace } from "@/lib/db/queries";
import { supabaseConfigStatus } from "@/lib/supabase/env";

export function RootFrame({ children }: { children: React.ReactNode }) {
  const status = supabaseConfigStatus();

  if (status === "demo") {
    return <DemoFrame>{children}</DemoFrame>;
  }

  if (status === "incomplete") {
    return <AuthScreen setup="incomplete" />;
  }

  return <AuthedFrame>{children}</AuthedFrame>;
}

async function DemoFrame({ children }: { children: React.ReactNode }) {
  const assistant = await loadAssistantHome();
  return (
    <SessionProvider value={{ demoMode: true, email: null }}>
      <PaAvatarProvider>
        <AppChrome
          handlingMode={assistant.mode}
          nudges={assistant.nudges}
          nudgeEmpty={assistant.notice ?? assistant.emptyCopy}
        >
          {children}
        </AppChrome>
      </PaAvatarProvider>
    </SessionProvider>
  );
}

async function AuthedFrame({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();

  if (!user) {
    return <AuthScreen />;
  }

  const [workspace, profile, assistant] = await Promise.all([
    loadWorkspace(),
    loadBusinessProfile(),
    loadAssistantHome(),
  ]);
  const sampleChats = workspace.source === "demo";
  const shop = shopFacts(profile);

  return (
    <SessionProvider value={{ demoMode: false, email: user.email }}>
      <PaAvatarProvider>
        <AppChrome
          sampleChats={sampleChats}
          whatsappConnected={workspace.whatsappConnected}
          handlingMode={assistant.mode}
          nudges={assistant.nudges}
          nudgeEmpty={assistant.notice ?? assistant.emptyCopy}
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
