import { Module } from '@nestjs/common';
import { AuthModule } from '@org/backend-auth';
import { AppSettingsModule } from '@org/backend-features-app-settings';
import { UserModule } from '@org/backend-features-user';
import { AccountRetentionController } from './account-retention.controller';
import { AccountRetentionJob } from './account-retention.job';
import { RetentionActivityListener } from './retention-activity.listener';

/** Inactive-account retention: stamps activity on auth, and runs a daily
 * warn-then-delete sweep driven by `app-settings` (with a manual admin
 * trigger). Uses the global `MailerService` and `AppConfigService`.
 * `@nestjs/schedule`'s `ScheduleModule.forRoot()` is registered once in
 * `apps/backend`. */
@Module({
  imports: [AuthModule, UserModule, AppSettingsModule],
  providers: [RetentionActivityListener, AccountRetentionJob],
  controllers: [AccountRetentionController],
})
export class AccountRetentionModule {}
