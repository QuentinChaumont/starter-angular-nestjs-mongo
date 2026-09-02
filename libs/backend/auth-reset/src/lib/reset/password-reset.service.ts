import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@org/backend-core';
import { SingleUseTokenService } from '../single-use-token';
import { PasswordResetToken } from './password-reset-token.schema';
import { PasswordResetTokenRepository } from './password-reset-token.repository';

const MS_PER_MINUTE = 60_000;

@Injectable()
export class PasswordResetService extends SingleUseTokenService<PasswordResetToken> {
  constructor(
    protected readonly repository: PasswordResetTokenRepository,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  protected ttlMs(): number {
    return this.config.auth.resetTokenTtlMinutes * MS_PER_MINUTE;
  }

  get ttlMinutes(): number {
    return this.config.auth.resetTokenTtlMinutes;
  }
}
