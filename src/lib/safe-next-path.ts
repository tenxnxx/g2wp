/**
 * Allow only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative URLs like //evil.com
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (trimmed.includes("://")) return fallback;
  return trimmed;
}
