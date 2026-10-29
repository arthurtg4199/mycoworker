import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Browser Supabase client. Session cookies match the server client. */
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase is not configured.");
  }

  return createBrowserClient(env.url, env.key);
}
