import type { AppConfigService } from '@org/backend-core';
import {
  DEFAULT_SCOPES,
  deriveCallbackUri,
  sharedProviderConfig,
} from '../oidc-provider-defaults';
import type { ResolvedOidcProvider } from '../resolve-oidc-config';

export const KEYCLOAK_PROVIDER_ID = 'keycloak';

/** Where Keycloak puts the realm roles in the id-token by default. */
const DEFAULT_KEYCLOAK_ROLES_CLAIM = 'realm_access.roles';
const DEFAULT_KEYCLOAK_LABEL = 'Keycloak';

/**
 * Keycloak as a preset: the starter user points `OIDC_KEYCLOAK_ISSUER` at
 * an existing realm (`https://host/realms/<realm>`) and supplies a client
 * id. The secret is optional — omit it for a public client (PKCE only,
 * like the generic provider). Realm roles are mapped onto local roles at
 * account creation via `OIDC_KEYCLOAK_ROLES_CLAIM` (default
 * `realm_access.roles`); no re-sync on later logins.
 *
 * Active only when issuer + client id are set **and** the callback origin
 * can be derived from `OIDC_REDIRECT_URI`.
 */
export function resolveKeycloakProvider(
  config: AppConfigService,
): ResolvedOidcProvider | null {
  const { issuer, clientId, clientSecret, rolesClaim, label } =
    config.oidcKeycloak;
  if (!issuer || !clientId) {
    return null;
  }

  const redirectUri = deriveCallbackUri(
    config.oidc.redirectUri,
    KEYCLOAK_PROVIDER_ID,
  );
  if (!redirectUri) {
    return null;
  }

  return {
    id: KEYCLOAK_PROVIDER_ID,
    label: label || DEFAULT_KEYCLOAK_LABEL,
    issuer,
    clientId,
    clientSecret: clientSecret || undefined,
    redirectUri,
    scopes: DEFAULT_SCOPES,
    rolesClaim: rolesClaim || DEFAULT_KEYCLOAK_ROLES_CLAIM,
    ...sharedProviderConfig(config),
  };
}
