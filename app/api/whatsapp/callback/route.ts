import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { tokensMatch } from "@/lib/whatsapp/crypto";
import { readWhatsAppConfig } from "@/lib/whatsapp/env";
import {
  discoverWhatsAppPhone,
  exchangeOAuthCode,
  subscribeWaba,
} from "@/lib/whatsapp/graph";
import { saveWhatsAppConnection } from "@/lib/whatsapp/store";

const OAUTH_COOKIE = "mcw_wa_oauth";

function finish(url: URL, status: "connected" | "error", reason?: string) {
  const next = new URL("/settings", url.origin);
  next.searchParams.set("whatsapp", status);
  if (reason) next.searchParams.set("reason", reason);
  const response = NextResponse.redirect(next);
  response.cookies.set(OAUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/whatsapp",
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  if (providerError) {
    return finish(
      url,
      "error",
      providerError === "access_denied" ? "denied" : "token",
    );
  }

  const user = await getAuthUser();
  if (!user) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(login);
  }

  const config = await readWhatsAppConfig();
  if (!config.oauthReady) return finish(url, "error", "config");

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const cookie = request.headers.get("cookie") ?? "";
  const expected = readCookie(cookie, OAUTH_COOKIE);
  if (!code || !expected || !tokensMatch(state, expected)) {
    return finish(url, "error", "state");
  }

  try {
    const token = await exchangeOAuthCode({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: `${url.origin}/api/whatsapp/callback`,
      code,
    });
    if (!token) return finish(url, "error", "token");

    const discovered = await discoverWhatsAppPhone({
      appId: config.appId,
      appSecret: config.appSecret,
      accessToken: token,
      preferredPhoneNumberId: config.phoneNumberId || undefined,
    });
    if (!discovered) return finish(url, "error", "number");

    let subscribed = false;
    try {
      subscribed = await subscribeWaba(discovered.wabaId, token);
    } catch {
      subscribed = false;
    }

    const saved = await saveWhatsAppConnection({
      userId: user.id,
      phoneNumberId: discovered.phone.id,
      displayPhoneNumber: discovered.phone.displayPhoneNumber,
      wabaId: discovered.wabaId,
      businessName: discovered.phone.verifiedName,
      accessToken: token,
      tokenSource: "oauth",
      keepAutoReply: true,
    });
    if (!saved.ok) return finish(url, "error", "number");

    const response = finish(url, "connected", subscribed ? undefined : "subscribe");
    return response;
  } catch (error) {
    console.error(
      "WhatsApp connect failed.",
      error instanceof Error ? error.name : "Error",
    );
    return finish(url, "error", "token");
  }
}

function readCookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName !== name) continue;
    return decodeURIComponent(rest.join("="));
  }
  return "";
}
