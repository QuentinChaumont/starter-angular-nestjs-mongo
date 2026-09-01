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
import type { AccessTokenResponse } from '@org/shared-contracts';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthCookieService } from './cookies/auth-cookie.service';
import { CsrfGuard } from './csrf/csrf.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { AuthenticatedUser } from './models/authenticated-user';
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
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
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
