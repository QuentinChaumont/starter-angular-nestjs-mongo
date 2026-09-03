import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@org/backend-core';
import { SingleUseTokenPurpose, SingleUseTokenService } from '../single-use-token';
import { SingleUseTokenRepository } from '../single-use-token.repository';

const MS_PER_MINUTE = 60_000;

@Injectable()
export class PasswordResetService extends SingleUseTokenService {
  constructor(
    protected readonly repository: SingleUseTokenRepository,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  protected purpose(): SingleUseTokenPurpose {
    return 'reset-password';
  }

  protected ttlMs(): number {
    return this.config.auth.resetTokenTtlMinutes * MS_PER_MINUTE;
  }

  get ttlMinutes(): number {
    return this.config.auth.resetTokenTtlMinutes;
  }
}
