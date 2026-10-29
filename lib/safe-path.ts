/** Keep redirects inside the app. */
export function safeAppPath(value: string | null | undefined) {
  if (!value) return "/";
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return "/";
  }
  if (value.startsWith("/login") || value.startsWith("/auth")) return "/";
  return value;
}
