import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../auth.service';
import { AuthStore } from '../auth.store';
import { sanitizeRedirect } from '../sanitize-redirect';
import { TwoFactorPrompt } from '../two-factor/two-factor-prompt';

/**
 * Landing route for the OIDC redirect. The backend put the freshly minted
 * access token in the URL fragment (`#access_token=…&redirect_to=…`); this
 * consumes it, scrubs the fragment from the address bar, loads the profile
 * and forwards to the intended page.
 *
 * If the account has TOTP 2FA on (V2.2 step 43) the fragment carries
 * `#pending_2fa=…` instead — the code prompt is shown right here.
 */
@Component({
  selector: 'lib-oidc-callback',
  imports: [MatProgressSpinnerModule, TwoFactorPrompt, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pendingToken(); as token) {
      <lib-two-factor-prompt [pendingToken]="token" [redirectTo]="redirectTo" />
    } @else {
      <section class="oidc-callback">
        <mat-progress-spinner
          mode="indeterminate"
          diameter="40"
        ></mat-progress-spinner>
        <p>{{ 'auth.callback.signingIn' | transloco }}</p>
      </section>
    }
  `,
  styles: `
    .oidc-callback {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
  `,
})
export class OidcCallback {
  private readonly document = inject(DOCUMENT);
  private readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly pendingToken = signal<string | null>(null);
  protected redirectTo = '/app';

  constructor() {
    const view = this.document.defaultView;
    const params = new URLSearchParams(
      (this.document.location?.hash ?? '').replace(/^#/, ''),
    );
    const token = params.get('access_token');
    const pending = params.get('pending_2fa');
    this.redirectTo = sanitizeRedirect(params.get('redirect_to'));

    // Drop the fragment so no token is left in history / referrers.
    view?.history.replaceState(
      null,
      '',
      this.document.location.pathname + this.document.location.search,
    );

    if (pending) {
      this.pendingToken.set(pending);
      return;
    }

    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    this.store.setAccessToken(token);
    this.auth.loadMe().subscribe({
      next: () => void this.router.navigateByUrl(this.redirectTo),
      error: () => {
        this.store.reset();
        void this.router.navigate(['/login']);
      },
    });
  }
}
