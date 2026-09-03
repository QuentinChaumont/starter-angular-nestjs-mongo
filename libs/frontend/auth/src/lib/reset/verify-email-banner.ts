import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { isApiError } from '@org/shared-contracts';
import { AuthStore } from '../auth.store';
import { ResetService } from './reset.service';

const DISMISS_KEY = 'app.verify-email-banner.dismissed';

function apiMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : null;
  return isApiError(body) ? body.message : fallback;
}

/**
 * A slim "please verify your email" bar. Renders only for an authenticated
 * user whose `emailVerifiedAt` is `null` — and stays hidden once dismissed
 * for the browser session (the profile page keeps the durable affordance).
 * Wired into the root component by the `auth-reset` generator.
 */
@Component({
  selector: 'lib-verify-email-banner',
  imports: [MatButtonModule, MatIconModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="verify-banner" role="status">
        <span class="verify-banner__text">
          {{ 'auth.verify.banner' | transloco }}
        </span>
        @if (message(); as m) {
          <span class="verify-banner__sent">{{ m }}</span>
        } @else {
          <button
            mat-button
            type="button"
            [disabled]="sending()"
            (click)="resend()"
          >
            {{ 'auth.verify.resend' | transloco }}
          </button>
        }
        <button
          mat-icon-button
          type="button"
          class="verify-banner__close"
          aria-label="Dismiss"
          (click)="dismiss()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>
    }
  `,
  styles: `
    .verify-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px 8px 8px 16px;
      background: var(--app-color-warn-container, #fff3cd);
      color: var(--app-color-on-warn-container, #664d03);
      font-size: 0.875rem;
      text-align: center;
    }
    .verify-banner__sent {
      font-weight: 600;
    }
    .verify-banner__close {
      margin-inline-start: auto;
    }
  `,
})
export class VerifyEmailBanner {
  private readonly store = inject(AuthStore);
  private readonly reset = inject(ResetService);
  private readonly transloco = inject(TranslocoService);

  protected readonly sending = signal(false);
  protected readonly message = signal<string | null>(null);
  private readonly dismissed = signal(readDismissed());

  protected readonly visible = computed(
    () => !this.dismissed() && this.store.user()?.emailVerifiedAt === null,
  );

  protected resend(): void {
    if (this.sending()) {
      return;
    }
    this.sending.set(true);
    this.reset.resendVerification().subscribe({
      next: () => {
        this.sending.set(false);
        this.message.set(this.transloco.translate('auth.verify.resent'));
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.message.set(
          apiMessage(err, 'Could not send the email right now.'),
        );
      },
    });
  }

  protected dismiss(): void {
    this.dismissed.set(true);
    try {
      globalThis.sessionStorage?.setItem(DISMISS_KEY, '1');
    } catch {
      // storage unavailable — it just reappears next navigation
    }
  }
}

function readDismissed(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}
