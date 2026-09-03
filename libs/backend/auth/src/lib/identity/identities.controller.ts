import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import type {
  ConnectedAccounts,
  StartIdentityLinkResponse,
} from '@org/shared-contracts';
import type { Response } from 'express';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import { OidcService } from '../oidc/oidc.service';
import { IdentityService } from './identity.service';

/** Where the "Connect" callback lands the browser once linking is done. */
const LINK_RETURN_PATH = '/app/profile';

/** Fallback label for a linked provider that is no longer configured. */
const titleCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

/**
 * "Connected accounts" (V2.2 step 42): list / connect / disconnect the OIDC
 * providers linked to the current account. All bearer-authenticated (no
 * CSRF guard — an attacker can't forge the `Authorization` header), same as
 * `POST /auth/change-password`.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth/identities')
@UseGuards(JwtAuthGuard)
export class IdentitiesController {
  constructor(
    private readonly identities: IdentityService,
    private readonly users: UserService,
    private readonly oidc: OidcService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConnectedAccounts> {
    const withPassword = await this.users.findByIdWithPassword(user.id);
    const linked = await this.identities.listForUser(user.id);
    const labels = new Map(
      this.oidc.listProviders().map((p) => [p.id, p.label]),
    );

    return {
      hasPassword: Boolean(withPassword.password),
      identities: linked.map((identity) => ({
        provider: identity.provider,
        label: labels.get(identity.provider) ?? titleCase(identity.provider),
        email: identity.email ?? null,
        linkedAt: identity.linkedAt.toISOString(),
      })),
    };
  }

  @ApiExcludeEndpoint()
  @Post(':providerId/link')
  async startLink(
    @Param('providerId') providerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StartIdentityLinkResponse> {
    const provider = this.oidc.requireProvider(providerId);
    const authRequest = await this.oidc.createAuthRequest(provider.id);

    this.cookies.setOidcTransaction(res, {
      providerId: provider.id,
      state: authRequest.state,
      nonce: authRequest.nonce,
      codeVerifier: authRequest.codeVerifier,
      redirectTo: LINK_RETURN_PATH,
      linkUserId: user.id,
    });

    return { authorizationUrl: authRequest.url };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':providerId')
  async unlink(
    @Param('providerId') providerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    const withPassword = await this.users.findByIdWithPassword(user.id);
    await this.identities.unlink(user.id, providerId, {
      hasPassword: Boolean(withPassword.password),
    });
  }
}
