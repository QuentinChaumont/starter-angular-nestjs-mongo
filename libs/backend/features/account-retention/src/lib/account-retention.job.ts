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
    // A warning is only "fresh" for `2 * warnWindow` days after it was
    // sent. Without this bound, disabling retention (`inactiveDays: null`)
    // after warnings went out and later re-enabling it (or raising
    // `inactiveDays`) would delete previously-warned accounts on the very
    // next sweep off a long-stale warning email — see final-review finding
    // #7. Past the freshness window the account is treated as unwarned
    // again (see the warn-phase `expiredWarningBefore` use below) and gets
    // a fresh warning instead of being deleted outright. The slack itself
    // (`warnWindow`) is an arbitrary but reasonable choice.
    const staleWarningBefore =
      warnWindow != null
        ? new Date(now.getTime() - 2 * warnWindow * DAY_MS)
        : undefined;

    let warned = 0;
    if (warnWindow != null) {
      const before = new Date(
        now.getTime() - (inactiveDays - warnWindow) * DAY_MS,
      );
      const candidates = await this.users.findRetentionCandidates({
        before,
        onlyUnwarned: true,
        expiredWarningBefore: staleWarningBefore,
        limit,
      });
      for (const user of candidates) {
        const reference = user.lastActiveAt ?? user.createdAt;
        // The warn phase only selects accounts whose reference date has
        // just crossed `now - (inactiveDays - warnWindow)`, but an account
        // can sit unwarned past that point (e.g. a lowered `inactiveDays`,
        // or simply never having been swept before). `reference +
        // inactiveDays` alone can then land in the past. The account can
        // never actually be deleted before its full warning window has
        // elapsed (the delete-phase guard below requires it), so the
        // stated date is never earlier than that.
        const deletionOn = new Date(
          Math.max(
            reference.getTime() + inactiveDays * DAY_MS,
            now.getTime() + warnWindow * DAY_MS,
          ),
        );
        try {
          const base = (
            this.config.oidc.frontendUrl ?? this.config.http.corsOrigins[0]
          ).replace(/\/$/, '');
          const mail = renderAccountRetentionWarning({
            firstName: user.firstName,
            lastActiveOn: formatDate(reference, user.locale),
            deletionOn: formatDate(deletionOn, user.locale),
            url: `${base}/app/profile`,
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
            warnedAfter: staleWarningBefore,
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
