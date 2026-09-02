import type { AppConfigService } from '@org/backend-core';

export const DEFAULT_SCOPES = 'openid profile email';
export const DEFAULT_POST_LOGIN_REDIRECT = '/app';
export const DEFAULT_FRONTEND_URL = 'http://localhost:4200';

/**
 * Bits every OIDC provider shares, resolved from the generic `OIDC_*`
 * variables (the browser return URL and the default landing path are the
 * same whichever provider was used).
 */
export interface SharedProviderConfig {
  frontendUrl: string;
  postLoginRedirect: string;
  requireVerifiedEmail: boolean;
}

export function sharedProviderConfig(
  config: AppConfigService,
): SharedProviderConfig {
  return {
    frontendUrl: config.oidc.frontendUrl ?? DEFAULT_FRONTEND_URL,
    postLoginRedirect: config.oidc.postLoginRedirect ?? DEFAULT_POST_LOGIN_REDIRECT,
    requireVerifiedEmail: config.oidc.requireVerifiedEmail ?? true,
  };
}

/**
 * Every provider's callback lives at `.../oidc/<id>/callback` on the same
 * origin. Derives one provider's callback from another's by swapping the id
 * segment — used to give the presets (Google, Keycloak) a redirect URI
 * without a dedicated variable each. Returns `null` when `base` is not a
 * recognisable OIDC callback URL.
 */
export function deriveCallbackUri(
  base: string | undefined,
  providerId: string,
): string | null {
  if (!base) {
    return null;
  }
  if (/\/oidc\/[^/]+\/callback\/?$/.test(base)) {
    return base.replace(
      /\/oidc\/[^/]+\/callback\/?$/,
      `/oidc/${providerId}/callback`,
    );
  }
  // Legacy pre-V2.2 shape (`.../oidc/callback`, no id segment).
  if (/\/oidc\/callback\/?$/.test(base)) {
    return base.replace(/\/oidc\/callback\/?$/, `/oidc/${providerId}/callback`);
  }
  return null;
}
