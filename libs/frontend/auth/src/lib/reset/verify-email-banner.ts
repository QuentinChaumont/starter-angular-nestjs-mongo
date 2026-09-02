import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore } from '../auth.store';
import { ResetService } from './reset.service';

/**
 * A slim "please verify your email" bar. Renders only for an authenticated
 * user whose `emailVerifiedAt` is known to be `null` — so it stays hidden
 * on the login screen and until `GET /auth/me` has resolved. Wired into
 * the root component by the `auth-reset` generator.
 */
@Component({
  selector: 'lib-verify-email-banner',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="verify-banner" role="status">
        <span>
          Please verify your email address to secure your account.
        </span>
        @if (sent()) {
          <span class="verify-banner__sent">Verification email sent.</span>
        } @else {
          <button
            mat-button
            type="button"
            [disabled]="sending()"
            (click)="resend()"
          >
            Resend email
          </button>
        }
      </div>
    }
  `,
  styles: `
    .verify-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px 16px;
      background: var(--app-color-warn-container, #fff3cd);
      color: var(--app-color-on-warn-container, #664d03);
      font-size: 0.875rem;
      text-align: center;
    }
    .verify-banner__sent {
      font-weight: 600;
    }
  `,
})
export class VerifyEmailBanner {
  private readonly store = inject(AuthStore);
  private readonly reset = inject(ResetService);

  protected readonly sending = signal(false);
  protected readonly sent = signal(false);

  protected readonly visible = computed(
    () => this.store.user()?.emailVerifiedAt === null,
  );

  protected resend(): void {
    if (this.sending()) {
      return;
    }
    this.sending.set(true);
    this.reset.resendVerification().subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
    });
  }
}
