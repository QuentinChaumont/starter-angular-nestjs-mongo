/**
 * Reads one cookie from a `document.cookie` string. Used for the
 * non-httpOnly `csrf-token` cookie the backend sets alongside the session.
 */
export function readCookie(
  cookieString: string | undefined,
  name: string,
): string | null {
  if (!cookieString) {
    return null;
  }
  for (const part of cookieString.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}
