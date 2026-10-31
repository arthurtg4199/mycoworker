import { GRAPH_VERSION } from "@/lib/whatsapp/env";

const GRAPH_ORIGIN = "https://graph.facebook.com";

export type WhatsAppPhone = {
  id: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
};

export type SendTextResult =
  | { ok: true; waMessageId: string | null }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function graphUrl(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${GRAPH_ORIGIN}/${GRAPH_VERSION}${clean}`;
}

async function graphJson(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  if (!text) return { ok: response.ok, status: response.status, body: null };
  try {
    return { ok: response.ok, status: response.status, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: response.status, body: null };
  }
}

function graphErrorMessage(body: unknown, fallback: string) {
  if (!isRecord(body) || !isRecord(body.error)) return fallback;
  const code = typeof body.error.code === "number" ? body.error.code : null;
  if (code === 190 || code === 102) {
    return "Meta rejected that WhatsApp token. Connect again from Settings.";
  }
  if (code === 10 || code === 200 || code === 294) {
    return "This token is not allowed to use WhatsApp yet.";
  }
  if (code === 131026) {
    return "That number is not on the WhatsApp test allow list yet.";
  }
  if (code === 131047) {
    return "WhatsApp closed the 24-hour reply window. This app does not send paid templates.";
  }
  if (code === 368) {
    return "Meta blocked this send. Check the WhatsApp account in Meta Business settings.";
  }
  return fallback;
}

export async function fetchPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
): Promise<WhatsAppPhone | null> {
  const url = new URL(graphUrl(`/${phoneNumberId}`));
  url.searchParams.set("fields", "id,display_phone_number,verified_name");
  const result = await graphJson(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!result.ok || !isRecord(result.body)) return null;
  const id = typeof result.body.id === "string" ? result.body.id : phoneNumberId;
  if (!/^[0-9]{6,32}$/.test(id)) return null;
  const display =
    typeof result.body.display_phone_number === "string"
      ? result.body.display_phone_number.trim().slice(0, 40)
      : null;
  const name =
    typeof result.body.verified_name === "string"
      ? result.body.verified_name.trim().slice(0, 120)
      : null;
  return {
    id,
    displayPhoneNumber: display || null,
    verifiedName: name || null,
  };
}

export async function sendWhatsAppText(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<SendTextResult> {
  const to = input.to.replace(/\D/g, "");
  if (to.length < 6) {
    return { ok: false, message: "This chat has no WhatsApp number." };
  }
  const result = await graphJson(graphUrl(`/${input.phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: input.body },
    }),
  });
  if (!result.ok) {
    return {
      ok: false,
      message: graphErrorMessage(result.body, "WhatsApp could not send that reply."),
    };
  }
  const waMessageId =
    isRecord(result.body) &&
    Array.isArray(result.body.messages) &&
    isRecord(result.body.messages[0]) &&
    typeof result.body.messages[0].id === "string"
      ? result.body.messages[0].id
      : null;
  return { ok: true, waMessageId };
}

type TokenResponse = { access_token?: string };

export async function exchangeOAuthCode(input: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<string | null> {
  const url = new URL(graphUrl("/oauth/access_token"));
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("code", input.code);
  const result = await graphJson(url.toString());
  if (!result.ok || !isRecord(result.body)) return null;
  const token = (result.body as TokenResponse).access_token;
  if (!token) return null;

  const extended = new URL(graphUrl("/oauth/access_token"));
  extended.searchParams.set("grant_type", "fb_exchange_token");
  extended.searchParams.set("client_id", input.appId);
  extended.searchParams.set("client_secret", input.appSecret);
  extended.searchParams.set("fb_exchange_token", token);
  const longer = await graphJson(extended.toString());
  if (longer.ok && isRecord(longer.body)) {
    const longToken = (longer.body as TokenResponse).access_token;
    if (longToken) return longToken;
  }
  return token;
}

function collectWabaIds(body: unknown) {
  const ids = new Set<string>();
  if (!isRecord(body) || !isRecord(body.data)) return ids;
  const scopes = body.data.granular_scopes;
  if (!Array.isArray(scopes)) return ids;
  for (const scope of scopes) {
    if (!isRecord(scope)) continue;
    const name = typeof scope.scope === "string" ? scope.scope : "";
    if (!name.includes("whatsapp")) continue;
    if (!Array.isArray(scope.target_ids)) continue;
    for (const id of scope.target_ids) {
      if (typeof id === "string" && /^[0-9]{6,32}$/.test(id)) ids.add(id);
    }
  }
  return ids;
}

async function listWabaIdsFromBusinesses(accessToken: string) {
  const ids = new Set<string>();
  const businesses = await graphJson(
    graphUrl("/me/businesses?fields=id&limit=5"),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!businesses.ok || !isRecord(businesses.body) || !Array.isArray(businesses.body.data)) {
    return ids;
  }
  for (const business of businesses.body.data.slice(0, 5)) {
    if (!isRecord(business) || typeof business.id !== "string") continue;
    for (const edge of [
      "owned_whatsapp_business_accounts",
      "client_whatsapp_business_accounts",
    ]) {
      const listed = await graphJson(
        graphUrl(`/${business.id}/${edge}?fields=id&limit=5`),
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!listed.ok || !isRecord(listed.body) || !Array.isArray(listed.body.data)) continue;
      for (const account of listed.body.data) {
        if (isRecord(account) && typeof account.id === "string" && /^[0-9]{6,32}$/.test(account.id)) {
          ids.add(account.id);
        }
      }
    }
  }
  return ids;
}

export async function discoverWhatsAppPhone(input: {
  appId: string;
  appSecret: string;
  accessToken: string;
  preferredPhoneNumberId?: string;
}): Promise<{ phone: WhatsAppPhone; wabaId: string } | null> {
  const debugUrl = new URL(graphUrl("/debug_token"));
  debugUrl.searchParams.set("input_token", input.accessToken);
  debugUrl.searchParams.set("access_token", `${input.appId}|${input.appSecret}`);
  const debug = await graphJson(debugUrl.toString());
  let wabaIds = collectWabaIds(debug.body);
  if (wabaIds.size === 0) {
    wabaIds = await listWabaIdsFromBusinesses(input.accessToken);
  }

  for (const wabaId of wabaIds) {
    const listed = await graphJson(
      graphUrl(`/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`),
      { headers: { Authorization: `Bearer ${input.accessToken}` } },
    );
    if (!listed.ok || !isRecord(listed.body) || !Array.isArray(listed.body.data)) continue;
    const phones = listed.body.data.flatMap((item) => {
      if (!isRecord(item) || typeof item.id !== "string") return [];
      if (!/^[0-9]{6,32}$/.test(item.id)) return [];
      return [
        {
          id: item.id,
          displayPhoneNumber:
            typeof item.display_phone_number === "string"
              ? item.display_phone_number.trim().slice(0, 40)
              : null,
          verifiedName:
            typeof item.verified_name === "string"
              ? item.verified_name.trim().slice(0, 120)
              : null,
        },
      ];
    });
    if (phones.length === 0) continue;
    const preferred = input.preferredPhoneNumberId
      ? phones.find((phone) => phone.id === input.preferredPhoneNumberId)
      : null;
    const phone = preferred ?? phones[0];
    if (!phone) continue;
    return { phone, wabaId };
  }
  return null;
}

export async function subscribeWaba(wabaId: string, accessToken: string) {
  const result = await graphJson(graphUrl(`/${wabaId}/subscribed_apps`), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return result.ok;
}

export function oauthDialogUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
  configId?: string;
}) {
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  if (input.configId) {
    url.searchParams.set("config_id", input.configId);
    url.searchParams.set("override_default_response_type", "true");
    url.searchParams.set(
      "extras",
      JSON.stringify({
        setup: {},
        sessionInfoVersion: "3",
        version: "v4",
      }),
    );
  } else {
    url.searchParams.set(
      "scope",
      [
        "whatsapp_business_management",
        "whatsapp_business_messaging",
        "business_management",
      ].join(","),
    );
  }
  return url.toString();
}
