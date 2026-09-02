import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type {
  AccessTokenResponse,
  MeResponse,
  RegistrationInfo,
} from '@org/shared-contracts';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@org/backend-core';
import { AuthService } from './auth.service';
import { AuthCookieService } from './cookies/auth-cookie.service';
import { CsrfGuard } from './csrf/csrf.guard';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from '@org/backend-core';
import type { SessionContext } from './refresh/refresh-token.service';

const TOKEN_TYPE = 'Bearer' as const;

function sessionContext(req: Request): SessionContext {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Get('registration')
  registration(): RegistrationInfo {
    return { enabled: this.authService.isRegistrationEnabled() };
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse & { user: AuthenticatedUser }> {
    const result = await this.authService.register(dto, sessionContext(req));
    this.cookies.setSession(res, result.session);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: TOKEN_TYPE,
      user: result.user,
    };
  }

  @UseGuards(AuthThrottlerGuard)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse & { user: AuthenticatedUser }> {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      sessionContext(req),
    );
    this.cookies.setSession(res, result.session);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: TOKEN_TYPE,
      user: result.user,
    };
  }

  @ApiCookieAuth()
  @UseGuards(CsrfGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    const result = await this.authService.refresh(
      this.cookies.readRefreshToken(req),
      sessionContext(req),
    );
    this.cookies.setSession(res, result.session);

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: TOKEN_TYPE,
    };
  }

  @ApiCookieAuth()
  @UseGuards(CsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(this.cookies.readRefreshToken(req));
    this.cookies.clearSession(res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.authService.currentUser(user.id);
  }

  /**
   * Demo endpoint exercising `RolesGuard`. A real project would put
   * `@Roles(...)` on its own protected routes instead.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  admin(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
