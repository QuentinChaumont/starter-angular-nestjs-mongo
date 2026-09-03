import { buildTestConfig } from '@org/backend-testing';
import { resolveKeycloakProvider } from './keycloak';

const GENERIC_REDIRECT =
  'https://api.example/api/auth/oidc/generic/callback';
const KEYCLOAK_REDIRECT =
  'https://api.example/api/auth/oidc/keycloak/callback';

describe('resolveKeycloakProvider', () => {
  it('is null unless issuer + client id are set', () => {
    expect(
      resolveKeycloakProvider(
        buildTestConfig({ OIDC_REDIRECT_URI: GENERIC_REDIRECT }),
      ),
    ).toBeNull();
    expect(
      resolveKeycloakProvider(
        buildTestConfig({
          OIDC_REDIRECT_URI: GENERIC_REDIRECT,
          OIDC_KEYCLOAK_ISSUER: 'https://kc.example/realms/app',
        }),
      ),
    ).toBeNull();
  });

  it('is null when no callback origin can be derived', () => {
    expect(
      resolveKeycloakProvider(
        buildTestConfig({
          OIDC_KEYCLOAK_ISSUER: 'https://kc.example/realms/app',
          OIDC_KEYCLOAK_CLIENT_ID: 'kc-id',
        }),
      ),
    ).toBeNull();
  });

  it('defaults the roles claim, label, scopes; public client when no secret', () => {
    const provider = resolveKeycloakProvider(
      buildTestConfig({
        OIDC_REDIRECT_URI: GENERIC_REDIRECT,
        OIDC_KEYCLOAK_ISSUER: 'https://kc.example/realms/app',
        OIDC_KEYCLOAK_CLIENT_ID: 'kc-id',
      }),
    );

    expect(provider).toEqual({
      id: 'keycloak',
      label: 'Keycloak',
      issuer: 'https://kc.example/realms/app',
      clientId: 'kc-id',
      clientSecret: undefined,
      redirectUri: KEYCLOAK_REDIRECT,
      scopes: 'openid profile email',
      rolesClaim: 'realm_access.roles',
      frontendUrl: 'http://localhost:4200',
      postLoginRedirect: '/app',
      requireVerifiedEmail: true,
    });
  });

  it('honours the secret, custom label and custom roles claim', () => {
    const provider = resolveKeycloakProvider(
      buildTestConfig({
        OIDC_REDIRECT_URI: GENERIC_REDIRECT,
        OIDC_KEYCLOAK_ISSUER: 'https://kc.example/realms/app',
        OIDC_KEYCLOAK_CLIENT_ID: 'kc-id',
        OIDC_KEYCLOAK_CLIENT_SECRET: 'kc-secret',
        OIDC_KEYCLOAK_LABEL: 'Company SSO',
        OIDC_KEYCLOAK_ROLES_CLAIM: 'resource_access.app.roles',
      }),
    );

    expect(provider).toMatchObject({
      label: 'Company SSO',
      clientSecret: 'kc-secret',
      rolesClaim: 'resource_access.app.roles',
    });
  });
});
