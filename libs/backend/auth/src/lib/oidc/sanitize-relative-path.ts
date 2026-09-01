/**
 * Keeps a post-login redirect on our own site. Accepts only a single-slash
 * absolute path (`/app/reports`); rejects absolute URLs, protocol-relative
 * values (`//evil.com`), backslashes and whitespace — anything that could
 * turn the OIDC callback into an open redirect. Falls back to `fallback`.
 */
export function sanitizeRelativePath(
  value: string | undefined,
  fallback: string,
): string {
  if (!value || !/^\/(?!\/)[^\s\\]*$/.test(value)) {
    return fallback;
  }
  return value;
}
