import { connection } from "next/server";

export const GRAPH_VERSION = "v25.0";

export type WhatsAppConfig = {
  appId: string;
  appSecret: string;
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  embeddedSignupConfigId: string;
  oauthReady: boolean;
  serverNumberReady: boolean;
  webhookReady: boolean;
  embeddedSignup: boolean;
};

function envValue(name: string) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Server-only Meta settings. Dynamic lookup so a deploy can read values
 * that were added after the build. Nothing here is sent to the browser.
 */
export async function readWhatsAppConfig(): Promise<WhatsAppConfig> {
  await connection();
  const appId = envValue("META_APP_ID");
  const appSecret = envValue("META_APP_SECRET");
  const accessToken = envValue("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = envValue("WHATSAPP_PHONE_NUMBER_ID");
  const verifyToken = envValue("WEBHOOK_VERIFY_TOKEN");
  const embeddedSignupConfigId = envValue("META_EMBEDDED_SIGNUP_CONFIG_ID");
  const oauthReady = Boolean(appId && appSecret);
  return {
    appId,
    appSecret,
    accessToken,
    phoneNumberId,
    verifyToken,
    embeddedSignupConfigId,
    oauthReady,
    serverNumberReady: Boolean(accessToken && /^[0-9]{6,32}$/.test(phoneNumberId)),
    webhookReady: verifyToken.length >= 8,
    embeddedSignup: Boolean(oauthReady && embeddedSignupConfigId),
  };
}
