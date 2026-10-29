import { cache } from "react";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string;
};

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  if (!getSupabaseEnv()) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    const email = typeof data.claims.email === "string" ? data.claims.email : "";
    return { id: data.claims.sub, email };
  } catch {
    return null;
  }
});
