import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeAppPath } from "@/lib/safe-path";
import { getSupabaseEnv } from "@/lib/supabase/env";

function carryCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
  return to;
}

/**
 * Refresh the auth cookies on each request.
 * When the Supabase env vars are missing, the request continues unchanged
 * so a deploy without them still serves demo mode.
 */
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  const path = request.nextUrl.pathname;

  if (!env) {
    if (path === "/login" || path.startsWith("/login/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  let signedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  } catch {
    signedIn = false;
  }

  const isLogin = path === "/login" || path.startsWith("/login/");
  const isAuthCallback = path === "/auth/callback" || path.startsWith("/auth/");

  if (!signedIn && !isLogin && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const next = `${path}${request.nextUrl.search}`;
    if (next !== "/") url.searchParams.set("next", next);
    if (request.nextUrl.searchParams.get("notice") === "confirm") {
      url.searchParams.set("notice", "confirm");
    }
    return carryCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (signedIn && isLogin) {
    const destination = new URL(
      safeAppPath(request.nextUrl.searchParams.get("next")),
      request.url,
    );
    return carryCookies(supabaseResponse, NextResponse.redirect(destination));
  }

  return supabaseResponse;
}
