import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isEmailOtpType(value: string): value is EmailOtpType {
  return otpTypes.has(value as EmailOtpType);
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const failure = NextResponse.redirect(new URL("/login?notice=confirm", url.origin));

  if (!getSupabaseEnv()) {
    return NextResponse.redirect(new URL("/", url.origin));
  }

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));

  try {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return failure;
      return NextResponse.redirect(new URL(next, url.origin));
    }

    if (tokenHash && type && isEmailOtpType(type)) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (error) return failure;
      return NextResponse.redirect(new URL(next, url.origin));
    }
  } catch {
    return failure;
  }

  return failure;
}
