import type { AppConfigService } from '@org/backend-core';

const DEFAULT_SCOPES = 'openid profile email';
const DEFAULT_POST_LOGIN_REDIRECT = '/app';
const DEFAULT_FRONTEND_URL = 'http://localhost:4200';

export interface ResolvedOidcConfig {
  issuer: string;
  clientId: string;
  /** Absent → the client is public and uses PKCE only. */
  clientSecret?: string;
  redirectUri: string;
  /** Space-separated scope string. */
  scopes: string;
  /** Base URL the browser is sent back to after login. */
  frontendUrl: string;
  /** Relative path appended to `frontendUrl` when none is requested. */
  postLoginRedirect: string;
  requireVerifiedEmail: boolean;
  /** Dot-path to a `string[]` claim to map onto the local user's roles. */
  rolesClaim?: string;
}

/**
 * OIDC is enabled only once the mandatory trio is configured. Everything
 * else has a sensible default. Returns `null` when OIDC is off, so callers
 * can keep local login working untouched.
 */
export function resolveOidcConfig(
  config: AppConfigService,
): ResolvedOidcConfig | null {
  const {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    postLoginRedirect,
    frontendUrl,
    requireVerifiedEmail,
    rolesClaim,
  } = config.oidc;

  if (!issuer || !clientId || !redirectUri) {
    return null;
  }

  return {
    issuer,
    clientId,
    clientSecret: clientSecret || undefined,
    redirectUri,
    scopes: scopes ?? DEFAULT_SCOPES,
    frontendUrl: frontendUrl ?? DEFAULT_FRONTEND_URL,
    postLoginRedirect: postLoginRedirect ?? DEFAULT_POST_LOGIN_REDIRECT,
    requireVerifiedEmail: requireVerifiedEmail ?? true,
    rolesClaim: rolesClaim || undefined,
  };
}
