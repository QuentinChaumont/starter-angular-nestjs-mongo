import { Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from '@org/backend-core';
import { MAIL_TRANSPORT } from './mail.types';
import type { MailMessage, MailTransport } from './mail.types';

/**
 * The one entry point features use to send email. Fills in the `From`
 * address from `MAIL_FROM` and delegates delivery to the configured
 * `MailTransport` (console by default, SMTP when `SMTP_URL` is set).
 */
@Injectable()
export class MailerService {
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    private readonly config: AppConfigService,
  ) {}

  async send(message: MailMessage): Promise<void> {
    await this.transport.send({ from: this.config.mailer.from, ...message });
  }
}
