import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { AuthStore } from '../auth.store';
import { sanitizeRedirect } from '../sanitize-redirect';

/**
 * Landing route for the OIDC redirect. The backend put the freshly minted
 * access token in the URL fragment (`#access_token=…&redirect_to=…`); this
 * consumes it, scrubs the fragment from the address bar, loads the profile
 * and forwards to the intended page.
 */
@Component({
  selector: 'lib-oidc-callback',
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="oidc-callback">
      <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
      <p>Signing you in…</p>
    </section>
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

  constructor() {
    const view = this.document.defaultView;
    const params = new URLSearchParams(
      (this.document.location?.hash ?? '').replace(/^#/, ''),
    );
    const token = params.get('access_token');
    const redirectTo = sanitizeRedirect(params.get('redirect_to'));

    // Drop the fragment so the token isn't left in history / referrers.
    view?.history.replaceState(
      null,
      '',
      this.document.location.pathname + this.document.location.search,
    );

    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    this.store.setAccessToken(token);
    this.auth.loadMe().subscribe({
      next: () => void this.router.navigateByUrl(redirectTo),
      error: () => {
        this.store.reset();
        void this.router.navigate(['/login']);
      },
    });
  }
}
