/**
 * Keeps a post-login redirect on our own app. Accepts only a single-slash
 * absolute path (`/app/reports`); rejects absolute URLs, protocol-relative
 * values (`//evil.com`), backslashes and whitespace. Falls back to
 * `fallback` (default `/`).
 */
export function sanitizeRedirect(
  value: string | null | undefined,
  fallback = '/',
): string {
  if (!value || !/^\/(?!\/)[^\s\\]*$/.test(value)) {
    return fallback;
  }
  return value;
}
