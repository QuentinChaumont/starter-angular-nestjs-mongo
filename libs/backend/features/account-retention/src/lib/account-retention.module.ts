import { Module } from '@nestjs/common';
import { AuthModule } from '@org/backend-auth';
import { AppSettingsModule } from '@org/backend-features-app-settings';
import { UserModule } from '@org/backend-features-user';
import { RetentionActivityListener } from './retention-activity.listener';

/** Inactive-account retention: stamps activity on auth, and (Task 7) runs
 * a daily warn-then-delete sweep driven by `app-settings`. Uses the global
 * `MailerService`. `@nestjs/schedule`'s `ScheduleModule.forRoot()` is
 * registered once in `apps/backend`. */
@Module({
  imports: [AuthModule, UserModule, AppSettingsModule],
  providers: [RetentionActivityListener],
})
export class AccountRetentionModule {}
