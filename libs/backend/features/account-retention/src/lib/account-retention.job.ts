import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfigService, AppLogger } from '@org/backend-core';
import { AppSettingsService } from '@org/backend-features-app-settings';
import { UserService } from '@org/backend-features-user';
import { MailerService, renderAccountRetentionWarning } from '@org/backend-mailer';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily sweep: email a warning to accounts nearing the inactivity limit,
 * then permanently delete accounts past it that have had their full
 * warning window. Both thresholds come from `app-settings` at runtime;
 * when `inactiveDays` is null the sweep is a no-op. */
@Injectable()
export class AccountRetentionJob {
  constructor(
    private readonly settings: AppSettingsService,
    private readonly users: UserService,
    private readonly mailer: MailerService,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  // A decorator can't read DI, so `@Cron` reads the raw env var here; the
  // DI-friendly mirror `AppConfigService.accountRetention.cron` uses the
  // same default and is what the rest of the code should consult.
  @Cron(process.env['ACCOUNT_RETENTION_CRON'] ?? '0 3 * * *', {
    name: 'account-retention-sweep',
  })
  handleCron(): Promise<{ warned: number; deleted: number }> {
    return this.run();
  }

  async run(
    now: Date = new Date(),
  ): Promise<{ warned: number; deleted: number }> {
    const { inactiveDays, warningDays } = (await this.settings.get())
      .accountRetention;
    if (inactiveDays == null) {
      return { warned: 0, deleted: 0 };
    }
    const limit = this.config.accountRetention.batchLimit;
    // Non-null only when a warning email is actually due before deletion;
    // used as the narrowed value everywhere the warn phase needs it.
    const warnWindow =
      warningDays != null && warningDays < inactiveDays ? warningDays : null;

    let warned = 0;
    if (warnWindow != null) {
      const before = new Date(
        now.getTime() - (inactiveDays - warnWindow) * DAY_MS,
      );
      const candidates = await this.users.findRetentionCandidates({
        before,
        onlyUnwarned: true,
        limit,
      });
      for (const user of candidates) {
        const reference = user.lastActiveAt ?? user.createdAt;
        const deletionOn = new Date(
          reference.getTime() + inactiveDays * DAY_MS,
        );
        try {
          const mail = renderAccountRetentionWarning({
            firstName: user.firstName,
            lastActiveOn: formatDate(reference, user.locale),
            deletionOn: formatDate(deletionOn, user.locale),
            url: `${this.config.oidc?.frontendUrl ?? ''}/app/profile`,
            locale: user.locale,
          });
          await this.mailer.send({ to: user.email, ...mail });
          await this.users.markRetentionWarned(user._id.toString(), now);
          warned++;
        } catch (error) {
          this.logger.error(
            `retention warning email failed for ${user._id}: ${String(error)}`,
            undefined,
            'AccountRetentionJob',
          );
        }
      }
    }

    const deleteBefore = new Date(now.getTime() - inactiveDays * DAY_MS);
    const deletable = await this.users.findRetentionCandidates(
      warnWindow != null
        ? {
            before: deleteBefore,
            warnedBefore: new Date(now.getTime() - warnWindow * DAY_MS),
            limit,
          }
        : { before: deleteBefore, limit },
    );
    let deleted = 0;
    for (const user of deletable) {
      try {
        await this.users.deleteById(user._id.toString(), {
          reason: 'retention',
        });
        deleted++;
      } catch (error) {
        this.logger.error(
          `retention delete failed for ${user._id}: ${String(error)}`,
          undefined,
          'AccountRetentionJob',
        );
      }
    }

    this.logger.log(
      `retention sweep: warned=${warned} deleted=${deleted}`,
      'AccountRetentionJob',
    );
    return { warned, deleted };
  }
}

function formatDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
