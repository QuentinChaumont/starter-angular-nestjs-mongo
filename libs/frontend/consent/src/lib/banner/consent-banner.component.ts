import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CONSENT_CONFIG } from '../consent.config';
import { ConsentService } from '../consent.service';
import { ConsentPreferences } from '../preferences/consent-preferences.component';

/**
 * Bottom-of-page consent notice. Non-blocking: the page paints and stays
 * usable behind it — it informs and offers a choice, it does not lock the
 * screen. "Accept all" and "Reject all" carry equal visual weight.
 *
 * Mounted once in `app.ts`, outside the router outlet, so it covers public
 * and private routes alike.
 */
@Component({
  selector: 'lib-consent-banner',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (consent.bannerVisible()) {
      <aside class="consent" role="region" aria-label="Cookie consent" aria-live="polite">
        <p class="consent__text">
          We use strictly necessary cookies to run the site, and — with your
          consent — optional ones. See our
          <a [href]="config.legal.cookiePolicyRoute" target="_blank" rel="noopener">
            cookie policy</a
          >.
        </p>
        <div class="consent__actions">
          <button mat-stroked-button (click)="customize()">Customise</button>
          <button mat-stroked-button (click)="consent.rejectAll()">
            Reject all
          </button>
          <button mat-flat-button color="primary" (click)="consent.acceptAll()">
            Accept all
          </button>
        </div>
      </aside>
    }
  `,
  styles: `
    .consent {
      position: fixed;
      inset-inline: 0;
      inset-block-end: 0;
      z-index: 1000;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 24px;
      background: var(--app-color-surface);
      color: var(--app-color-on-surface);
      border-block-start: 1px solid var(--app-color-outline);
      box-shadow: 0 -4px 16px rgb(0 0 0 / 12%);
    }
    .consent__text {
      margin: 0;
      flex: 1 1 320px;
      font-size: 0.9rem;
    }
    .consent__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class ConsentBanner {
  protected readonly consent = inject(ConsentService);
  protected readonly config = inject(CONSENT_CONFIG);
  private readonly dialog = inject(MatDialog);

  constructor() {
    // "Manage cookies" / "Customise" both funnel through the service tick.
    effect(() => {
      if (this.consent.reopenTick() > 0) {
        this.openPreferences();
      }
    });
  }

  protected customize(): void {
    this.openPreferences();
  }

  private openPreferences(): void {
    this.dialog.open(ConsentPreferences, { width: '480px', maxWidth: '92vw' });
  }
}
