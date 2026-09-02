import { Global, Module } from '@nestjs/common';
import { AppConfigModule, AppConfigService, AppLogger } from '@org/backend-core';
import { ConsoleMailTransport } from './console.transport';
import { MAIL_TRANSPORT, MailTransport } from './mail.types';
import { MailerService } from './mailer.service';
import { SmtpMailTransport } from './smtp.transport';

/**
 * The transactional email brick. Global so `MailerService` is injectable
 * anywhere without re-importing. Zero network and zero external dependency
 * until `SMTP_URL` is set — see the brick README.
 */
@Global()
@Module({
  imports: [AppConfigModule],
  providers: [
    MailerService,
    {
      provide: MAIL_TRANSPORT,
      inject: [AppConfigService, AppLogger],
      useFactory: (
        config: AppConfigService,
        logger: AppLogger,
      ): MailTransport => {
        const { smtpUrl, previewDir } = config.mailer;
        return smtpUrl
          ? new SmtpMailTransport(smtpUrl, logger)
          : new ConsoleMailTransport(logger, previewDir);
      },
    },
  ],
  exports: [MailerService],
})
export class MailerModule {}
