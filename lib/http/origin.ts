import { headers } from "next/headers";

/** Public origin for OAuth redirects and the webhook address shown in Settings. */
export async function siteOrigin() {
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
