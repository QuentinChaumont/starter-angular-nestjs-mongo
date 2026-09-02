import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AppConfigService, AppLogger } from '@org/backend-core';
import { MAIL_TRANSPORT } from './mail.types';
import type { MailMessage, MailTransport } from './mail.types';

/**
 * The one entry point features use to send email. Fills in the `From`
 * address from `MAIL_FROM` and delegates delivery to the configured
 * `MailTransport` (console by default, SMTP when `SMTP_URL` is set).
 */
@Injectable()
export class MailerService implements OnApplicationBootstrap {
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  /** One line at startup when mail can't actually be delivered, so a
   * missing `SMTP_URL` isn't discovered only when a user asks for a
   * password reset. */
  onApplicationBootstrap(): void {
    if (!this.config.mailer.smtpUrl) {
      this.logger.warn(
        'Mailer configuration incomplete: SMTP_URL is not set, so email is only logged and written to .eml previews — nothing is delivered. Set SMTP_URL (and `npm add nodemailer`) before production.',
        'MailerService',
      );
    }
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.send({ from: this.config.mailer.from, ...message });
  }
}
