import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import {
  AppConfigService,
  NotFoundError,
  UnauthorizedError,
} from '@org/backend-core';
import type { OidcProviderInfo } from '@org/shared-contracts';
import type { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import { OidcClaims } from './oidc-claims';
import { OidcUserLinker } from './oidc-user.linker';
import { OidcService } from './oidc.service';
import { resolveOidcConfig } from './resolve-oidc-config';
import { sanitizeRelativePath } from './sanitize-relative-path';

const LOGIN_PATH = '/api/auth/oidc/login';

@ApiTags('auth')
@Controller('auth')
export class OidcController {
  constructor(
    private readonly oidc: OidcService,
    private readonly linker: OidcUserLinker,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly config: AppConfigService,
  ) {}

  @Get('oidc/provider')
  provider(): OidcProviderInfo {
    return { enabled: this.oidc.isEnabled(), loginUrl: LOGIN_PATH };
  }

  @ApiExcludeEndpoint()
  @Get('oidc/login')
  async login(
    @Query('redirectTo') redirectTo: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const cfg = resolveOidcConfig(this.config);
    if (!cfg) {
      throw new NotFoundError('OIDC_NOT_CONFIGURED', 'OIDC login is not enabled');
    }

    const authRequest = await this.oidc.createAuthRequest();
    this.cookies.setOidcTransaction(res, {
      state: authRequest.state,
      nonce: authRequest.nonce,
      codeVerifier: authRequest.codeVerifier,
      redirectTo: sanitizeRelativePath(redirectTo, cfg.postLoginRedirect),
    });

    res.redirect(authRequest.url);
  }

  @ApiExcludeEndpoint()
  @Get('oidc/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const tx = this.cookies.readOidcTransaction(req);
    this.cookies.clearOidcTransaction(res);
    const cfg = resolveOidcConfig(this.config);

    if (!cfg || !tx) {
      throw new UnauthorizedError(
        'OIDC_STATE_INVALID',
        'OIDC login session is missing or has expired',
      );
    }
    if (error) {
      throw new UnauthorizedError(
        'OIDC_PROVIDER_ERROR',
        `The identity provider returned "${error}"`,
      );
    }
    if (!code || !state || state !== tx.state) {
      throw new UnauthorizedError('OIDC_STATE_INVALID', 'OIDC state mismatch');
    }

    let claims: OidcClaims;
    try {
      claims = await this.oidc.exchange(
        { code, state },
        { state: tx.state, nonce: tx.nonce, codeVerifier: tx.codeVerifier },
      );
    } catch {
      throw new UnauthorizedError(
        'OIDC_EXCHANGE_FAILED',
        'Could not complete the OIDC login',
      );
    }

    const user = await this.linker.linkFromClaims(claims);
    const result = await this.auth.issueSession(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.cookies.setSession(res, result.session);

    // Always land on the SPA's dedicated callback route; it consumes the
    // token from the fragment, scrubs the URL, then forwards to
    // `redirect_to`.
    const callbackUrl = new URL('/auth/callback', cfg.frontendUrl).toString();
    const fragment =
      `access_token=${encodeURIComponent(result.accessToken)}` +
      `&expires_in=${result.expiresIn}` +
      `&token_type=Bearer` +
      `&redirect_to=${encodeURIComponent(tx.redirectTo)}`;

    res.redirect(`${callbackUrl}#${fragment}`);
  }
}
