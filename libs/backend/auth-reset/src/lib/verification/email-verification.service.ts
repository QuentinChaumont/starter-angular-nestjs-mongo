import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@org/backend-core';
import { SingleUseTokenPurpose, SingleUseTokenService } from '../single-use-token';
import { SingleUseTokenRepository } from '../single-use-token.repository';

const MS_PER_HOUR = 3_600_000;

@Injectable()
export class EmailVerificationService extends SingleUseTokenService {
  constructor(
    protected readonly repository: SingleUseTokenRepository,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  protected purpose(): SingleUseTokenPurpose {
    return 'verify-email';
  }

  protected ttlMs(): number {
    return this.config.auth.verificationTokenTtlHours * MS_PER_HOUR;
  }
}
