import { buildTestConfig } from '@org/backend-testing';
import { resolveGoogleProvider } from './google';

const GENERIC_REDIRECT =
  'https://api.example/api/auth/oidc/generic/callback';

describe('resolveGoogleProvider', () => {
  it('is null unless both credentials are set', () => {
    expect(
      resolveGoogleProvider(
        buildTestConfig({ OIDC_REDIRECT_URI: GENERIC_REDIRECT }),
      ),
    ).toBeNull();
    expect(
      resolveGoogleProvider(
        buildTestConfig({
          OIDC_REDIRECT_URI: GENERIC_REDIRECT,
          OIDC_GOOGLE_CLIENT_ID: 'g-id',
        }),
      ),
    ).toBeNull();
  });

  it('is null when no callback origin can be derived', () => {
    expect(
      resolveGoogleProvider(
        buildTestConfig({
          OIDC_GOOGLE_CLIENT_ID: 'g-id',
          OIDC_GOOGLE_CLIENT_SECRET: 'g-secret',
        }),
      ),
    ).toBeNull();
  });

  it('presets issuer + scopes and swaps the callback id segment', () => {
    const provider = resolveGoogleProvider(
      buildTestConfig({
        OIDC_REDIRECT_URI: GENERIC_REDIRECT,
        OIDC_GOOGLE_CLIENT_ID: 'g-id',
        OIDC_GOOGLE_CLIENT_SECRET: 'g-secret',
        OIDC_FRONTEND_URL: 'https://app.example',
        OIDC_POST_LOGIN_REDIRECT: '/home',
      }),
    );

    expect(provider).toEqual({
      id: 'google',
      label: 'Google',
      issuer: 'https://accounts.google.com',
      clientId: 'g-id',
      clientSecret: 'g-secret',
      redirectUri: 'https://api.example/api/auth/oidc/google/callback',
      scopes: 'openid profile email',
      frontendUrl: 'https://app.example',
      postLoginRedirect: '/home',
      requireVerifiedEmail: true,
    });
  });

  it('derives the callback from a legacy pre-V2.2 redirect uri', () => {
    const provider = resolveGoogleProvider(
      buildTestConfig({
        OIDC_REDIRECT_URI: 'https://api.example/api/auth/oidc/callback',
        OIDC_GOOGLE_CLIENT_ID: 'g-id',
        OIDC_GOOGLE_CLIENT_SECRET: 'g-secret',
      }),
    );

    expect(provider?.redirectUri).toBe(
      'https://api.example/api/auth/oidc/google/callback',
    );
  });
});
