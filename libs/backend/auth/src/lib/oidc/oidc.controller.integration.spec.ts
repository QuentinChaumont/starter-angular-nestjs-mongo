import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AppConfigModule,
  AppConfigService,
  AppHttpModule,
  GlobalExceptionFilter,
  LoggerModule,
  useRequestIdMiddleware,
} from '@org/backend-core';
import { buildTestConfig, listenOnRandomPort } from '@org/backend-testing';
import { AuthService } from '../auth.service';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import { OidcUserLinker } from './oidc-user.linker';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';

const AUTH_REQUEST = {
  url: 'https://idp.example/authorize?client_id=client-1&state=state-xyz',
  state: 'state-xyz',
  nonce: 'nonce-abc',
  codeVerifier: 'verifier-123',
};

const fakeOidcService = {
  isEnabled: () => true,
  createAuthRequest: async () => AUTH_REQUEST,
  exchange: async (
    _params: { code: string; state: string },
    checks: { state: string },
  ) => {
    if (checks.state !== AUTH_REQUEST.state) {
      throw new Error('state mismatch');
    }
    return {
      sub: 'sub-1',
      email: 'jane@example.com',
      emailVerified: true,
      raw: {},
    };
  },
};

const fakeLinker = {
  linkFromClaims: async () => ({ id: 'u1', roles: [] as string[] }),
};

const fakeAuthService = {
  issueSession: async () => ({
    accessToken: 'access-token-value',
    expiresIn: 900,
    user: { id: 'u1', roles: [] as string[] },
    session: {
      refreshToken: 'refresh-value',
      refreshExpiresAt: new Date(Date.now() + 3_600_000),
      csrfToken: 'csrf-value',
    },
  }),
};

function txCookie(redirectTo = '/app'): string {
  const value = Buffer.from(
    JSON.stringify({
      state: AUTH_REQUEST.state,
      nonce: AUTH_REQUEST.nonce,
      codeVerifier: AUTH_REQUEST.codeVerifier,
      redirectTo,
    }),
    'utf-8',
  ).toString('base64url');
  return `oidc_tx=${value}`;
}

function setCookie(response: Awaited<ReturnType<typeof fetch>>, name: string) {
  return response.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${name}=`));
}

describe('OidcController (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, LoggerModule, AppHttpModule],
      controllers: [OidcController],
      providers: [
        AuthCookieService,
        { provide: OidcService, useValue: fakeOidcService },
        { provide: OidcUserLinker, useValue: fakeLinker },
        { provide: AuthService, useValue: fakeAuthService },
      ],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        buildTestConfig({
          OIDC_ISSUER: 'https://idp.example',
          OIDC_CLIENT_ID: 'client-1',
          OIDC_REDIRECT_URI: 'http://localhost/api/auth/oidc/callback',
          OIDC_FRONTEND_URL: 'http://localhost:4200',
        }),
      )
      .compile();

    app = moduleRef.createNestApplication();
    useRequestIdMiddleware(app);
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    baseUrl = `${await listenOnRandomPort(app)}/auth/oidc`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports the provider as enabled', async () => {
    const response = await fetch(`${baseUrl}/provider`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      enabled: true,
      loginUrl: '/api/auth/oidc/login',
    });
  });

  it('redirects to the provider and stores the transaction cookie', async () => {
    const response = await fetch(`${baseUrl}/login?redirectTo=/app/reports`, {
      redirect: 'manual',
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(AUTH_REQUEST.url);
    expect(setCookie(response, 'oidc_tx')).toMatch(/HttpOnly/i);
  });

  it('falls back to the default redirect for an unsafe redirectTo', async () => {
    const response = await fetch(`${baseUrl}/login?redirectTo=//evil.com`, {
      redirect: 'manual',
    });

    const raw = setCookie(response, 'oidc_tx') as string;
    const value = raw.split(';')[0].split('=')[1];
    const tx = JSON.parse(Buffer.from(value, 'base64url').toString('utf-8'));
    expect(tx.redirectTo).toBe('/app');
  });

  it('completes the callback: sets session cookies and redirects to the front with the token in the fragment', async () => {
    const response = await fetch(`${baseUrl}/callback?code=the-code&state=state-xyz`, {
      redirect: 'manual',
      headers: { cookie: txCookie('/app') },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'http://localhost:4200/auth/callback#access_token=access-token-value&expires_in=900&token_type=Bearer&redirect_to=%2Fapp',
    );
    expect(setCookie(response, 'refresh_token')).toContain('refresh-value');
    expect(setCookie(response, 'csrf-token')).toContain('csrf-value');
    expect(setCookie(response, 'oidc_tx')).toBeDefined(); // cleared
  });

  it('rejects a callback whose state does not match the cookie (401)', async () => {
    const response = await fetch(`${baseUrl}/callback?code=c&state=wrong`, {
      redirect: 'manual',
      headers: { cookie: txCookie('/app') },
    });

    expect(response.status).toBe(401);
    expect(((await response.json()) as any).code).toBe('OIDC_STATE_INVALID');
  });

  it('rejects a callback with no transaction cookie (401)', async () => {
    const response = await fetch(`${baseUrl}/callback?code=c&state=state-xyz`, {
      redirect: 'manual',
    });

    expect(response.status).toBe(401);
    expect(((await response.json()) as any).code).toBe('OIDC_STATE_INVALID');
  });
});
