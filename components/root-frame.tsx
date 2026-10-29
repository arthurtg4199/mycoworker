import { AppChrome } from "@/components/app-chrome";
import { AuthScreen } from "@/components/auth-screen";
import { SessionProvider } from "@/components/session";
import { getAuthUser } from "@/lib/auth";
import { supabaseConfigStatus } from "@/lib/supabase/env";

export function RootFrame({ children }: { children: React.ReactNode }) {
  const status = supabaseConfigStatus();

  if (status === "demo") {
    return (
      <SessionProvider value={{ demoMode: true, email: null }}>
        <AppChrome>{children}</AppChrome>
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

  return (
    <SessionProvider value={{ demoMode: false, email: user.email }}>
      <AppChrome>{children}</AppChrome>
    </SessionProvider>
  );
}
