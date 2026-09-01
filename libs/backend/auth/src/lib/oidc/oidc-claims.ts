/** The subset of OIDC id-token claims the starter actually uses. */
export interface OidcClaims {
  sub: string;
  email?: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  name?: string;
  /** All claims, for `rolesClaim` extraction. */
  raw: Record<string, unknown>;
}

/**
 * Reads a `string[]` claim addressed by a dot-path (e.g.
 * `realm_access.roles` for Keycloak). Anything missing or the wrong shape
 * yields `[]` — roles are additive, never a reason to fail a login.
 */
export function extractRoles(
  claims: Record<string, unknown>,
  path: string | undefined,
): string[] {
  if (!path) {
    return [];
  }

  let current: unknown = claims;
  for (const key of path.split('.')) {
    if (current !== null && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return [];
    }
  }

  return Array.isArray(current) && current.every((r) => typeof r === 'string')
    ? (current as string[])
    : [];
}
