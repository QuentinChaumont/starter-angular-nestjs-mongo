import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, UnauthorizedError } from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import type {
  AccessTokenResponse,
  TwoFactorConfirmResponse,
  TwoFactorSetupResponse,
} from '@org/shared-contracts';
import type { Request, Response } from 'express';
import { AuthService } from '../auth.service';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import {
  ConfirmTwoFactorDto,
  DisableTwoFactorDto,
  VerifyTwoFactorDto,
} from '../dto/two-factor.dto';
import { AuthThrottlerGuard } from '../guards/auth-throttler.guard';
import { TwoFactorService } from './two-factor.service';

const TOKEN_TYPE = 'Bearer' as const;

/**
 * TOTP two-factor endpoints (V2.2 step 43). `setup` / `confirm` / `disable`
 * are bearer-authenticated (managed from the profile page); `verify` is the
 * second leg of a login and takes the `pending_2fa` token instead.
 */
@ApiTags('auth')
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(
    private readonly twoFactor: TwoFactorService,
    private readonly auth: AuthService,
    private readonly users: UserService,
    private readonly cookies: AuthCookieService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AuthThrottlerGuard)
  @Post('setup')
  setup(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TwoFactorSetupResponse> {
    return this.twoFactor.setup(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AuthThrottlerGuard)
  @Post('confirm')
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmTwoFactorDto,
  ): Promise<TwoFactorConfirmResponse> {
    return this.twoFactor.confirm(user.id, dto.code);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AuthThrottlerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('disable')
  async disable(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DisableTwoFactorDto,
  ): Promise<void> {
    await this.twoFactor.disable(user.id, dto.password);
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('verify')
  async verify(
    @Body() dto: VerifyTwoFactorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse & { user: AuthenticatedUser }> {
    const userId = await this.auth.consumePendingTwoFactor(dto.pendingToken);

    if (!(await this.twoFactor.verifyLoginCode(userId, dto.code))) {
      throw new UnauthorizedError(
        'TWO_FACTOR_INVALID',
        'That code is not valid',
      );
    }

    const account = await this.users.findById(userId);
    const result = await this.auth.startSession(
      { id: userId, roles: account.roles },
      { userAgent: req.headers['user-agent'], ip: req.ip },
    );
    this.cookies.setSession(res, result.session);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: TOKEN_TYPE,
      user: result.user,
    };
  }
}
