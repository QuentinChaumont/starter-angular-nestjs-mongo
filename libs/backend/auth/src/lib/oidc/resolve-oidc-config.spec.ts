import { buildTestConfig } from '@org/backend-testing';
import {
  resolveOidcProvider,
  resolveOidcProviders,
} from './resolve-oidc-config';

describe('resolveOidcProviders', () => {
  it('returns [] when the mandatory trio is incomplete', () => {
    expect(resolveOidcProviders(buildTestConfig())).toEqual([]);
    expect(
      resolveOidcProviders(
        buildTestConfig({ OIDC_ISSUER: 'https://idp', OIDC_CLIENT_ID: 'c' }),
      ),
    ).toEqual([]);
  });

  it('exposes the generic provider once issuer + clientId + redirectUri are set', () => {
    const providers = resolveOidcProviders(
      buildTestConfig({
        OIDC_ISSUER: 'https://idp.example',
        OIDC_CLIENT_ID: 'client-1',
        OIDC_REDIRECT_URI: 'https://api.example/api/auth/oidc/generic/callback',
      }),
    );

    expect(providers).toEqual([
      {
        id: 'generic',
        label: 'SSO',
        issuer: 'https://idp.example',
        clientId: 'client-1',
        clientSecret: undefined,
        redirectUri: 'https://api.example/api/auth/oidc/generic/callback',
        scopes: 'openid profile email',
        frontendUrl: 'http://localhost:4200',
        postLoginRedirect: '/app',
        requireVerifiedEmail: true,
        rolesClaim: undefined,
      },
    ]);
  });

  it('honours overrides', () => {
    const [generic] = resolveOidcProviders(
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

    expect(generic).toMatchObject({
      clientSecret: 'shh',
      scopes: 'openid email',
      frontendUrl: 'https://app.example',
      postLoginRedirect: '/dashboard',
      requireVerifiedEmail: false,
      rolesClaim: 'realm_access.roles',
    });
  });
});

describe('resolveOidcProvider', () => {
  const configured = buildTestConfig({
    OIDC_ISSUER: 'https://idp.example',
    OIDC_CLIENT_ID: 'client-1',
    OIDC_REDIRECT_URI: 'https://api.example/cb',
  });

  it('returns the provider matching the id', () => {
    expect(resolveOidcProvider(configured, 'generic')?.id).toBe('generic');
  });

  it('returns null for an unknown id', () => {
    expect(resolveOidcProvider(configured, 'nope')).toBeNull();
    expect(resolveOidcProvider(buildTestConfig(), 'generic')).toBeNull();
  });
});
