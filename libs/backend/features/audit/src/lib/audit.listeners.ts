import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthEvents } from '@org/backend-auth';
import { UserEvents } from '@org/backend-features-user';
import { AUDIT_ACTION } from './audit-actions';
import { AuditService } from './audit.service';

/**
 * Wires the audit log onto the bundled bricks' lifecycle events (V2.3 step
 * 45). The `auth` / `user` bricks only **emit** — they never import this
 * module — so the audit brick stays fully optional.
 */
@Injectable()
export class AuditListeners implements OnModuleInit {
  constructor(
    private readonly audit: AuditService,
    private readonly authEvents: AuthEvents,
    private readonly userEvents: UserEvents,
  ) {}

  onModuleInit(): void {
    this.authEvents.onLoginSucceeded((e) =>
      this.audit.record({
        action: AUDIT_ACTION.LOGIN,
        actorId: e.userId,
        target: e.userId,
        targetType: 'user',
        meta: { method: e.method },
      }),
    );

    this.authEvents.onLoginFailed((e) =>
      this.audit.record({
        action: AUDIT_ACTION.LOGIN_FAILED,
        actorEmail: e.email,
        meta: { reason: e.reason },
      }),
    );

    this.authEvents.onPasswordChanged((e) =>
      this.audit.record({
        action: AUDIT_ACTION.PASSWORD_CHANGED,
        actorId: e.userId,
        target: e.userId,
        targetType: 'user',
      }),
    );

    this.authEvents.onTwoFactorEnabled((e) =>
      this.audit.record({
        action: AUDIT_ACTION.TWO_FACTOR_ENABLED,
        actorId: e.userId,
        target: e.userId,
        targetType: 'user',
      }),
    );

    this.authEvents.onTwoFactorDisabled((e) =>
      this.audit.record({
        action: AUDIT_ACTION.TWO_FACTOR_DISABLED,
        actorId: e.userId,
        target: e.userId,
        targetType: 'user',
      }),
    );

    this.authEvents.onTokenReused((e) =>
      this.audit.record({
        action: AUDIT_ACTION.TOKEN_REUSED,
        target: e.userId,
        targetType: 'user',
        meta: { familyId: e.familyId },
      }),
    );

    this.authEvents.onIdentityLinked((e) =>
      this.audit.record({
        action: AUDIT_ACTION.IDENTITY_LINKED,
        target: e.userId,
        targetType: 'user',
        meta: { provider: e.provider },
      }),
    );

    this.authEvents.onIdentityUnlinked((e) =>
      this.audit.record({
        action: AUDIT_ACTION.IDENTITY_UNLINKED,
        target: e.userId,
        targetType: 'user',
        meta: { provider: e.provider },
      }),
    );

    this.userEvents.onRolesChanged((e) =>
      this.audit.record({
        action: AUDIT_ACTION.ROLES_CHANGED,
        target: e.userId,
        targetType: 'user',
        meta: { roles: e.roles },
      }),
    );

    this.userEvents.onStatusChanged((e) =>
      this.audit.record({
        action: AUDIT_ACTION.STATUS_CHANGED,
        target: e.userId,
        targetType: 'user',
        meta: { active: e.active },
      }),
    );

    this.authEvents.onSessionsRevoked((e) =>
      this.audit.record({
        action: AUDIT_ACTION.SESSIONS_REVOKED,
        target: e.userId,
        targetType: 'user',
      }),
    );
  }
}
