import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@org/backend-core';
import type { CookieOptions, Request, Response } from 'express';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  OIDC_COOKIE_PATH,
  OIDC_TX_COOKIE_NAME,
  OIDC_TX_MAX_AGE_MS,
  REFRESH_COOKIE_NAME,
} from './cookie.constants';
import { parseCookies } from './parse-cookies';

export interface SessionCookies {
  refreshToken: string;
  refreshExpiresAt: Date;
  csrfToken: string;
}

export interface OidcTransaction {
  /** Which provider started this flow — the callback route must match it. */
  providerId: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectTo: string;
  /**
   * Set when the flow was started from the profile page's "Connect" button
   * (V2.2 step 42): the callback links the identity to this already-signed-in
   * user instead of opening a new session.
   */
  linkUserId?: string;
}

/**
 * Single place that knows how the refresh / CSRF cookies are shaped. The
 * `secure` flag defaults to on in production and off elsewhere (so local
 * http dev works), overridable via `AUTH_COOKIE_SECURE`.
 */
@Injectable()
export class AuthCookieService {
  constructor(private readonly config: AppConfigService) {}

  private baseOptions(): CookieOptions {
    return {
      path: AUTH_COOKIE_PATH,
      sameSite: 'lax',
      secure: this.isSecure(),
    };
  }

  private isSecure(): boolean {
    return (
      this.config.session.cookieSecure ??
      this.config.app.environment === 'production'
    );
  }

  setSession(res: Response, session: SessionCookies): void {
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
      ...this.baseOptions(),
      httpOnly: true,
      expires: session.refreshExpiresAt,
    });
    // The CSRF cookie must be readable by the SPA from *any* route
    // (double-submit — the interceptor copies it into a header), so it
    // gets `path: '/'` rather than the refresh cookie's `/api/auth`.
    res.cookie(CSRF_COOKIE_NAME, session.csrfToken, {
      ...this.baseOptions(),
      path: '/',
      httpOnly: false,
      expires: session.refreshExpiresAt,
    });
  }

  clearSession(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...this.baseOptions(),
      httpOnly: true,
    });
    res.clearCookie(CSRF_COOKIE_NAME, {
      ...this.baseOptions(),
      path: '/',
      httpOnly: false,
    });
  }

  readRefreshToken(req: Request): string | undefined {
    return parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
  }

  setOidcTransaction(res: Response, tx: OidcTransaction): void {
    const value = Buffer.from(JSON.stringify(tx), 'utf-8').toString(
      'base64url',
    );
    res.cookie(OIDC_TX_COOKIE_NAME, value, {
      path: OIDC_COOKIE_PATH,
      sameSite: 'lax',
      secure: this.isSecure(),
      httpOnly: true,
      maxAge: OIDC_TX_MAX_AGE_MS,
    });
  }

  readOidcTransaction(req: Request): OidcTransaction | undefined {
    const raw = parseCookies(req.headers.cookie)[OIDC_TX_COOKIE_NAME];
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(
        Buffer.from(raw, 'base64url').toString('utf-8'),
      ) as Partial<OidcTransaction>;
      if (
        typeof parsed.providerId === 'string' &&
        typeof parsed.state === 'string' &&
        typeof parsed.nonce === 'string' &&
        typeof parsed.codeVerifier === 'string' &&
        typeof parsed.redirectTo === 'string' &&
        (parsed.linkUserId === undefined ||
          typeof parsed.linkUserId === 'string')
      ) {
        return parsed as OidcTransaction;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  clearOidcTransaction(res: Response): void {
    res.clearCookie(OIDC_TX_COOKIE_NAME, {
      path: OIDC_COOKIE_PATH,
      sameSite: 'lax',
      secure: this.isSecure(),
      httpOnly: true,
    });
  }
}
