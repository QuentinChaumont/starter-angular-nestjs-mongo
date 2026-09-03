import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ConflictError,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import type { SessionInfo } from '@org/shared-contracts';
import type { Request } from 'express';
import { AuthEvents } from '../auth-events';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import { RefreshTokenService } from '../refresh/refresh-token.service';

/**
 * "Devices / active sessions" (V2.3 step 46). Self-service routes are
 * bearer-authenticated only (no CSRF guard — an attacker can't forge the
 * `Authorization` header, same as `change-password` / identities). The
 * refresh cookie is only *read*, to flag the current session.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth/sessions')
export class SessionsController {
  constructor(
    private readonly refreshTokens: RefreshTokenService,
    private readonly cookies: AuthCookieService,
    private readonly users: UserService,
    private readonly events: AuthEvents,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<SessionInfo[]> {
    return this.refreshTokens.listSessions(
      user.id,
      this.cookies.readRefreshToken(req),
    );
  }

  /** End every session except the one making this request. */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  async revokeOthers(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    const token = this.cookies.readRefreshToken(req);
    if (token) {
      await this.refreshTokens.revokeAllForUserExcept(user.id, token);
    } else {
      await this.refreshTokens.revokeAllForUser(user.id);
    }
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':familyId')
  async revokeOne(
    @Param('familyId') familyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    const token = this.cookies.readRefreshToken(req);
    if (token && (await this.refreshTokens.familyOfToken(token)) === familyId) {
      throw new ConflictError(
        'SESSION_IS_CURRENT',
        'This is your current session — sign out instead',
      );
    }
    await this.refreshTokens.revokeSession(user.id, familyId);
  }

  /** Admin: end every session of `userId`. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('revoke/:userId')
  async revokeForUser(@Param('userId') userId: string): Promise<void> {
    await this.users.findById(userId);
    await this.refreshTokens.revokeAllForUser(userId);
    this.events.emitSessionsRevoked({ userId });
  }
}
