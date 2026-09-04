import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { SessionInfo } from '@org/shared-contracts';
import { NotificationService } from '@org/frontend-feedback';
import { AsyncButtonDirective, RelativeTime, StatusBadge } from '@org/frontend-ui';
import { ProfileService } from '../profile.service';
import {
  PROFILE_FORM_STYLES,
  PROFILE_LIST_STYLES,
  apiMessage,
} from '../profile-shared';
import { ProfilePanel } from '../ui/profile-panel';

/** Every browser/device currently signed in (one row per refresh-token
 * family). Sign out a single one, or all but this browser. */
@Component({
  selector: 'lib-profile-sessions-section',
  imports: [
    MatButtonModule,
    AsyncButtonDirective,
    RelativeTime,
    StatusBadge,
    ProfilePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-profile-panel heading="Devices">
      @if (sessions().length > 1) {
        <button
          panelActions
          mat-stroked-button
          type="button"
          [libAsyncButton]="sessionsBusy()"
          (click)="signOutOthers()"
        >
          Sign out everywhere else
        </button>
      }

      <p class="profile__hint">
        Every browser or device currently signed in to your account.
      </p>
      <ul class="accounts">
        @for (session of sessions(); track session.id) {
          <li class="accounts__row">
            <div class="accounts__meta">
              <span class="accounts__name">
                {{ session.userAgent || 'Unknown device' }}
                @if (session.current) {
                  <lib-status-badge tone="success">This device</lib-status-badge>
                }
              </span>
              <span class="accounts__sub">
                {{ session.ip || 'no IP' }} · last active
                <lib-relative-time [value]="session.lastUsedAt" />
              </span>
            </div>
            @if (!session.current) {
              <button
                mat-stroked-button
                type="button"
                [libAsyncButton]="sessionsBusy()"
                (click)="signOut(session.id)"
              >
                Sign out
              </button>
            }
          </li>
        }
      </ul>
      @if (sessionsError()) {
        <p class="profile__error" role="alert">{{ sessionsError() }}</p>
      }
    </lib-profile-panel>
  `,
  styles: [PROFILE_FORM_STYLES, PROFILE_LIST_STYLES],
})
export class ProfileSessionsSection {
  private readonly service = inject(ProfileService);
  private readonly notify = inject(NotificationService, { optional: true });

  protected readonly sessions = signal<SessionInfo[]>([]);
  protected readonly sessionsBusy = signal(false);
  protected readonly sessionsError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.service.listSessions().subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: () => this.sessionsError.set('Could not load your devices.'),
    });
  }

  protected signOut(id: string): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessionsError.set(null);
    this.service.revokeSession(id).subscribe({
      next: () => {
        this.sessionsBusy.set(false);
        this.notify?.success('Device signed out.');
        this.load();
      },
      error: (err: unknown) => {
        this.sessionsBusy.set(false);
        this.sessionsError.set(
          apiMessage(err, 'Could not sign out that device.'),
        );
      },
    });
  }

  protected signOutOthers(): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessionsError.set(null);
    this.service.revokeOtherSessions().subscribe({
      next: () => {
        this.sessionsBusy.set(false);
        this.notify?.success('Signed out everywhere else.');
        this.load();
      },
      error: (err: unknown) => {
        this.sessionsBusy.set(false);
        this.sessionsError.set(
          apiMessage(err, 'Could not sign out the other devices.'),
        );
      },
    });
  }
}
