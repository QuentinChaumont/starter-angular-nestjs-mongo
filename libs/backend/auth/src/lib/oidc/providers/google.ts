import type { AppConfigService } from '@org/backend-core';
import {
  deriveCallbackUri,
  sharedProviderConfig,
} from '../oidc-provider-defaults';
import type { ResolvedOidcProvider } from '../resolve-oidc-config';

export const GOOGLE_PROVIDER_ID = 'google';

/** Fixed for Google — the starter user never sets these. */
const GOOGLE_ISSUER = 'https://accounts.google.com';
const GOOGLE_SCOPES = 'openid profile email';

/**
 * Google sign-in as a preset: the starter user supplies only a client id +
 * secret (created in the Google Cloud Console); the issuer and scopes are
 * hard-coded. Active only when both credentials are present **and** the
 * callback origin can be derived from `OIDC_REDIRECT_URI`.
 *
 * Google always returns a verified `email_verified` claim, so the shared
 * `requireVerifiedEmail` default (on) is exactly right — no Google-specific
 * handling needed. Google has no realm roles, so `rolesClaim` stays unset.
 */
export function resolveGoogleProvider(
  config: AppConfigService,
): ResolvedOidcProvider | null {
  const { clientId, clientSecret } = config.oidcGoogle;
  if (!clientId || !clientSecret) {
    return null;
  }

  const redirectUri = deriveCallbackUri(
    config.oidc.redirectUri,
    GOOGLE_PROVIDER_ID,
  );
  if (!redirectUri) {
    return null;
  }

  return {
    id: GOOGLE_PROVIDER_ID,
    label: 'Google',
    issuer: GOOGLE_ISSUER,
    clientId,
    clientSecret,
    redirectUri,
    scopes: GOOGLE_SCOPES,
    ...sharedProviderConfig(config),
  };
}
