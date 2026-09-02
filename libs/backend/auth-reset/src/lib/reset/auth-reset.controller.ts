import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import { AuthThrottlerGuard } from '@org/backend-auth';
import { AuthResetService } from './auth-reset.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './reset.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthResetController {
  constructor(private readonly resetService: AuthResetService) {}

  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.resetService.requestPasswordReset(dto.email);
  }

  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(AuthThrottlerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.resetService.verifyEmail(dto.token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('resend-verification')
  async resendVerification(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.resetService.resendVerification(user.id);
  }
}
