import { buildTestConfig } from '@org/backend-testing';
import type { Request, Response } from 'express';
import { AuthCookieService } from './auth-cookie.service';

function fakeResponse(): Response & {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
} {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response & { cookie: jest.Mock; clearCookie: jest.Mock };
}

const session = {
  refreshToken: 'refresh-abc',
  refreshExpiresAt: new Date('2030-01-01T00:00:00Z'),
  csrfToken: 'csrf-def',
};

describe('AuthCookieService', () => {
  it('sets an httpOnly refresh cookie and a readable csrf cookie, scoped to /api/auth', () => {
    const res = fakeResponse();
    new AuthCookieService(buildTestConfig({ NODE_ENV: 'production' })).setSession(
      res,
      session,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-abc',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/api/auth',
        expires: session.refreshExpiresAt,
      }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf-token',
      'csrf-def',
      expect.objectContaining({ httpOnly: false, secure: true }),
    );
  });

  it('defaults secure to false outside production', () => {
    const res = fakeResponse();
    new AuthCookieService(buildTestConfig({ NODE_ENV: 'development' })).setSession(
      res,
      session,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(String),
      expect.objectContaining({ secure: false }),
    );
  });

  it('honours an explicit AUTH_COOKIE_SECURE override', () => {
    const res = fakeResponse();
    new AuthCookieService(
      buildTestConfig({ NODE_ENV: 'production', AUTH_COOKIE_SECURE: false }),
    ).setSession(res, session);

    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.any(String),
      expect.objectContaining({ secure: false }),
    );
  });

  it('clears both cookies on clearSession', () => {
    const res = fakeResponse();
    new AuthCookieService(buildTestConfig()).clearSession(res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api/auth', httpOnly: true }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      'csrf-token',
      expect.objectContaining({ path: '/api/auth', httpOnly: false }),
    );
  });

  it('reads the refresh token out of the Cookie header', () => {
    const service = new AuthCookieService(buildTestConfig());
    const req = {
      headers: { cookie: 'csrf-token=x; refresh_token=the-token' },
    } as Request;

    expect(service.readRefreshToken(req)).toBe('the-token');
  });

  it('round-trips the OIDC transaction through an httpOnly cookie', () => {
    const service = new AuthCookieService(buildTestConfig());
    const res = fakeResponse();
    const tx = {
      state: 'st',
      nonce: 'no',
      codeVerifier: 'cv',
      redirectTo: '/app',
    };

    service.setOidcTransaction(res, tx);

    const [, value, options] = res.cookie.mock.calls[0];
    expect(res.cookie).toHaveBeenCalledWith(
      'oidc_tx',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: '/api/auth/oidc' }),
    );
    expect(options.maxAge).toBeGreaterThan(0);

    const req = { headers: { cookie: `oidc_tx=${value}` } } as Request;
    expect(service.readOidcTransaction(req)).toEqual(tx);
  });

  it('returns undefined for a malformed OIDC transaction cookie', () => {
    const service = new AuthCookieService(buildTestConfig());
    const req = { headers: { cookie: 'oidc_tx=not-base64-json' } } as Request;

    expect(service.readOidcTransaction(req)).toBeUndefined();
  });
});
