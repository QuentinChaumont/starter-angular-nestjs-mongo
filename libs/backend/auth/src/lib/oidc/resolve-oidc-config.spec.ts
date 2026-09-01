import { buildTestConfig } from '@org/backend-testing';
import { resolveOidcConfig } from './resolve-oidc-config';

describe('resolveOidcConfig', () => {
  it('returns null when the mandatory trio is incomplete', () => {
    expect(resolveOidcConfig(buildTestConfig())).toBeNull();
    expect(
      resolveOidcConfig(
        buildTestConfig({ OIDC_ISSUER: 'https://idp', OIDC_CLIENT_ID: 'c' }),
      ),
    ).toBeNull();
  });

  it('applies defaults once issuer + clientId + redirectUri are set', () => {
    const resolved = resolveOidcConfig(
      buildTestConfig({
        OIDC_ISSUER: 'https://idp.example',
        OIDC_CLIENT_ID: 'client-1',
        OIDC_REDIRECT_URI: 'https://api.example/api/auth/oidc/callback',
      }),
    );

    expect(resolved).toEqual({
      issuer: 'https://idp.example',
      clientId: 'client-1',
      clientSecret: undefined,
      redirectUri: 'https://api.example/api/auth/oidc/callback',
      scopes: 'openid profile email',
      frontendUrl: 'http://localhost:4200',
      postLoginRedirect: '/app',
      requireVerifiedEmail: true,
      rolesClaim: undefined,
    });
  });

  it('honours overrides', () => {
    const resolved = resolveOidcConfig(
      buildTestConfig({
        OIDC_ISSUER: 'https://idp.example',
        OIDC_CLIENT_ID: 'client-1',
        OIDC_REDIRECT_URI: 'https://api.example/cb',
        OIDC_CLIENT_SECRET: 'shh',
        OIDC_SCOPES: 'openid email',
        OIDC_FRONTEND_URL: 'https://app.example',
        OIDC_POST_LOGIN_REDIRECT: '/dashboard',
        OIDC_REQUIRE_VERIFIED_EMAIL: false,
        OIDC_ROLES_CLAIM: 'realm_access.roles',
      }),
    );

    expect(resolved).toMatchObject({
      clientSecret: 'shh',
      scopes: 'openid email',
      frontendUrl: 'https://app.example',
      postLoginRedirect: '/dashboard',
      requireVerifiedEmail: false,
      rolesClaim: 'realm_access.roles',
    });
  });
});
