import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function hashWebhookToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokensMatch(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

/** Meta signs the raw webhook body with the app secret. */
export function whatsAppSignatureMatches(
  rawBody: string,
  header: string | null,
  appSecret: string,
) {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const received = header.slice("sha256=".length).trim();
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  return tokensMatch(expected, received);
}
