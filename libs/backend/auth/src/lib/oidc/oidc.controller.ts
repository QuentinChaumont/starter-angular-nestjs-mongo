import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ApplicationError, UnauthorizedError } from '@org/backend-core';
import type { OidcProviderInfo } from '@org/shared-contracts';
import type { Request, Response } from 'express';
import { AuthService, isPendingTwoFactor } from '../auth.service';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import { OidcClaims } from './oidc-claims';
import { OidcUserLinker } from './oidc-user.linker';
import { OidcService } from './oidc.service';
import { sanitizeRelativePath } from './sanitize-relative-path';

/** Base-relative (no `/api` prefix): the SPA prepends its configured API base. */
const loginPath = (providerId: string): string =>
  `/auth/oidc/${providerId}/login`;

@ApiTags('auth')
@Controller('auth')
export class OidcController {
  constructor(
    private readonly oidc: OidcService,
    private readonly linker: OidcUserLinker,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get('oidc/providers')
  providers(): OidcProviderInfo[] {
    return this.oidc.listProviders().map(({ id, label }) => ({
      id,
      label,
      loginUrl: loginPath(id),
    }));
  }

  @ApiExcludeEndpoint()
  @Get('oidc/:providerId/login')
  async login(
    @Param('providerId') providerId: string,
    @Query('redirectTo') redirectTo: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const provider = this.oidc.requireProvider(providerId);

    const authRequest = await this.oidc.createAuthRequest(provider.id);
    this.cookies.setOidcTransaction(res, {
      providerId: provider.id,
      state: authRequest.state,
      nonce: authRequest.nonce,
      codeVerifier: authRequest.codeVerifier,
      redirectTo: sanitizeRelativePath(redirectTo, provider.postLoginRedirect),
    });

    res.redirect(authRequest.url);
  }

  @ApiExcludeEndpoint()
  @Get('oidc/:providerId/callback')
  async callback(
    @Param('providerId') providerId: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const tx = this.cookies.readOidcTransaction(req);
    this.cookies.clearOidcTransaction(res);

    if (!tx || tx.providerId !== providerId) {
      throw new UnauthorizedError(
        'OIDC_STATE_INVALID',
        'OIDC login session is missing or has expired',
      );
    }

    const provider = this.oidc.requireProvider(providerId);

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
        provider.id,
        { code, state },
        { state: tx.state, nonce: tx.nonce, codeVerifier: tx.codeVerifier },
      );
    } catch {
      throw new UnauthorizedError(
        'OIDC_EXCHANGE_FAILED',
        'Could not complete the OIDC login',
      );
    }

    // "Connect" flow (V2.2 step 42): link to the signed-in account and bounce
    // back to the profile page instead of opening a session.
    if (tx.linkUserId) {
      const profileUrl = new URL('/app/profile', provider.frontendUrl);
      try {
        await this.linker.linkToUser(provider.id, claims, tx.linkUserId);
        profileUrl.searchParams.set('linked', provider.id);
      } catch (err) {
        profileUrl.searchParams.set(
          'linkError',
          err instanceof ApplicationError ? err.code : 'IDENTITY_LINK_FAILED',
        );
      }
      res.redirect(profileUrl.toString());
      return;
    }

    const user = await this.linker.linkFromClaims(provider.id, claims);
    const result = await this.auth.issueSession(user, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Always land on the SPA's dedicated callback route; it consumes the
    // fragment, scrubs the URL, then forwards to `redirect_to`.
    const callbackUrl = new URL(
      '/auth/callback',
      provider.frontendUrl,
    ).toString();

    // TOTP 2FA on (V2.2 step 43): no session yet — hand the SPA a
    // `pending_2fa` token so it can prompt for a code.
    if (isPendingTwoFactor(result)) {
      const fragment =
        `pending_2fa=${encodeURIComponent(result.pendingToken)}` +
        `&redirect_to=${encodeURIComponent(tx.redirectTo)}`;
      res.redirect(`${callbackUrl}#${fragment}`);
      return;
    }

    this.cookies.setSession(res, result.session);
    const fragment =
      `access_token=${encodeURIComponent(result.accessToken)}` +
      `&expires_in=${result.expiresIn}` +
      `&token_type=Bearer` +
      `&redirect_to=${encodeURIComponent(tx.redirectTo)}`;

    res.redirect(`${callbackUrl}#${fragment}`);
  }
}
