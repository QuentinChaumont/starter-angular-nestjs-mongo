import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthEvents } from '@org/backend-auth';
import { UserService } from '@org/backend-features-user';

/** Stamps `User.lastActiveAt` whenever an account authenticates. Mirrors
 * the `audit` brick's `AuditListeners`: the `auth` brick only emits, it
 * never imports this module, so `account-retention` stays optional. */
@Injectable()
export class RetentionActivityListener implements OnModuleInit {
  constructor(
    private readonly authEvents: AuthEvents,
    private readonly users: UserService,
  ) {}

  onModuleInit(): void {
    this.authEvents.onLoginSucceeded((e) => {
      void this.users.recordActivity(e.userId);
    });
    this.authEvents.onSessionRefreshed((e) => {
      void this.users.recordActivity(e.userId);
    });
  }
}
