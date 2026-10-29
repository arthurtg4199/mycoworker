"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeAppPath } from "@/lib/safe-path";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  message?: string;
  confirmEmail?: boolean;
};

function plainAuthMessage(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "That email and password do not match.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (
    text.includes("already registered") ||
    text.includes("already been registered")
  ) {
    return "That email already has an account. Sign in instead.";
  }
  if (text.includes("password")) {
    return "Use a password of at least 6 characters.";
  }
  if (text.includes("email")) {
    return "Enter a valid email address.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many tries. Wait a moment, then try again.";
  }
  if (
    text.includes("fetch") ||
    text.includes("network") ||
    text.includes("failed to fetch")
  ) {
    return "We could not reach sign-in. Try again in a moment.";
  }
  return "Something went wrong. Try again.";
}

function readCredentials(email: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail.includes("@") || trimmedEmail.startsWith("@")) {
    return { error: "Enter a valid email address." as const };
  }
  if (password.length < 6) {
    return { error: "Use a password of at least 6 characters." as const };
  }
  return { email: trimmedEmail, password };
}

async function siteOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return null;
  const forwarded = headerStore.get("x-forwarded-proto");
  const proto =
    forwarded ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

export async function signIn(
  email: string,
  password: string,
  nextPath?: string,
): Promise<AuthFormState> {
  if (!getSupabaseEnv()) {
    return { message: "Sign-in is not set up yet." };
  }

  const credentials = readCredentials(email, password);
  if ("error" in credentials) return { message: credentials.error };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) return { message: plainAuthMessage(error.message) };
  } catch {
    return { message: "We could not reach sign-in. Try again in a moment." };
  }

  redirect(safeAppPath(nextPath));
}

export async function signUp(
  email: string,
  password: string,
  nextPath?: string,
): Promise<AuthFormState> {
  if (!getSupabaseEnv()) {
    return { message: "Sign-in is not set up yet." };
  }

  const credentials = readCredentials(email, password);
  if ("error" in credentials) return { message: credentials.error };

  try {
    const supabase = await createClient();
    const origin = await siteOrigin();
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: origin ? { emailRedirectTo: `${origin}/auth/callback` } : undefined,
    });
    if (error) return { message: plainAuthMessage(error.message) };
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { message: "That email already has an account. Sign in instead." };
    }
    if (!data.session) {
      return { confirmEmail: true };
    }
  } catch {
    return { message: "We could not reach sign-in. Try again in a moment." };
  }

  redirect(safeAppPath(nextPath));
}

export async function signOut() {
  if (getSupabaseEnv()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Still leave the screen. The next request will ask for sign-in again.
    }
  }
  redirect("/login");
}
