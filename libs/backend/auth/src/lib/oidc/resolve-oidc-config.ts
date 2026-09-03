import type { AppConfigService } from '@org/backend-core';
import {
  DEFAULT_SCOPES,
  sharedProviderConfig,
} from './oidc-provider-defaults';
import { resolveGoogleProvider } from './providers/google';
import { resolveKeycloakProvider } from './providers/keycloak';

/** Stable id of the built-in generic provider (`OIDC_ISSUER` / `OIDC_CLIENT_ID`). */
export const GENERIC_PROVIDER_ID = 'generic';

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
 * One active OIDC provider: its resolved config plus the identity used by
 * the per-provider routes (`/api/auth/oidc/:id/login`) and the login button.
 */
export interface ResolvedOidcProvider extends ResolvedOidcConfig {
  /** URL-safe, stable — used in the route path and the tx cookie. */
  id: string;
  /** Rendered on the login button (`Sign in with {label}`). */
  label: string;
}

function resolveGenericProvider(
  config: AppConfigService,
): ResolvedOidcProvider | null {
  const { issuer, clientId, clientSecret, redirectUri, scopes, rolesClaim } =
    config.oidc;

  if (!issuer || !clientId || !redirectUri) {
    return null;
  }

  return {
    id: GENERIC_PROVIDER_ID,
    label: 'SSO',
    issuer,
    clientId,
    clientSecret: clientSecret || undefined,
    redirectUri,
    scopes: scopes ?? DEFAULT_SCOPES,
    rolesClaim: rolesClaim || undefined,
    ...sharedProviderConfig(config),
  };
}

/**
 * Every OIDC provider currently active, in button order. Each provider has
 * its own issuer/clientId and its own login/callback routes; a project that
 * configures none gets an empty array (local login stays untouched).
 *
 * Fixed slots (V2.2): the generic provider (`OIDC_*`), then the Google
 * preset (`OIDC_GOOGLE_*`), then the Keycloak preset (`OIDC_KEYCLOAK_*`).
 */
export function resolveOidcProviders(
  config: AppConfigService,
): ResolvedOidcProvider[] {
  const providers: ResolvedOidcProvider[] = [];

  const generic = resolveGenericProvider(config);
  if (generic) {
    providers.push(generic);
  }

  const google = resolveGoogleProvider(config);
  if (google) {
    providers.push(google);
  }

  const keycloak = resolveKeycloakProvider(config);
  if (keycloak) {
    providers.push(keycloak);
  }

  return providers;
}

/** The active provider with this id, or `null`. */
export function resolveOidcProvider(
  config: AppConfigService,
  providerId: string,
): ResolvedOidcProvider | null {
  return (
    resolveOidcProviders(config).find((p) => p.id === providerId) ?? null
  );
}
