export type SupabaseEnv = {
  url: string;
  key: string;
};

export type SupabaseConfigStatus = "ready" | "demo" | "incomplete";

/**
 * Direct `process.env.NEXT_PUBLIC_*` reads so Next.js can inline them.
 * Both values must be present before sign-in replaces demo mode.
 */
export function supabaseConfigStatus(): SupabaseConfigStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (url && key) return "ready";
  if (!url && !key) return "demo";
  return "incomplete";
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) return null;
  return { url, key };
}
