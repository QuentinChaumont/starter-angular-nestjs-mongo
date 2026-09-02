import { Injectable } from '@nestjs/common';
import { AppConfigService } from '@org/backend-core';
import { SingleUseTokenService } from '../single-use-token';
import { EmailVerificationToken } from './email-verification-token.schema';
import { EmailVerificationTokenRepository } from './email-verification-token.repository';

const MS_PER_HOUR = 3_600_000;

@Injectable()
export class EmailVerificationService extends SingleUseTokenService<EmailVerificationToken> {
  constructor(
    protected readonly repository: EmailVerificationTokenRepository,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  protected ttlMs(): number {
    return this.config.auth.verificationTokenTtlHours * MS_PER_HOUR;
  }
}
