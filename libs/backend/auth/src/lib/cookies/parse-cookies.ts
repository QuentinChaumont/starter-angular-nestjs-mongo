/**
 * Minimal `Cookie:` header parser. Express doesn't parse cookies without
 * `cookie-parser`; the auth brick only ever needs to read two specific
 * cookies, so a dozen lines here beat pulling in (and wiring up) another
 * dependency. Setting cookies uses Express's native `res.cookie()`.
 */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) {
    return out;
  }

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = part.slice(0, eq).trim();
    if (!key) {
      continue;
    }
    const value = part.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }

  return out;
}
