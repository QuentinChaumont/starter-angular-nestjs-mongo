import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';

/**
 * A thin bar that appears when the browser reports no network. Mounted
 * once in `app.ts`, outside the router outlet, so it covers every route.
 * No dependencies — a plain status region, styled with the design tokens.
 */
@Component({
  selector: 'lib-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (offline()) {
      <div
        class="offline"
        role="status"
        aria-live="polite"
        data-testid="offline-banner"
      >
        You're offline. Changes may not be saved until your connection is
        back.
      </div>
    }
  `,
  styles: `
    .offline {
      position: fixed;
      inset-inline: 0;
      inset-block-start: 0;
      z-index: 1200;
      padding: 6px 16px;
      text-align: center;
      font-size: 0.8125rem;
      font-weight: 500;
      background: var(--app-color-error, #b3261e);
      color: var(--app-color-on-error, #fff);
    }
  `,
})
export class OfflineBanner {
  private readonly window = inject(DOCUMENT).defaultView;
  protected readonly offline = signal(false);

  constructor() {
    const win = this.window;
    const destroyRef = inject(DestroyRef);
    if (!win) {
      return;
    }

    const sync = () => this.offline.set(win.navigator.onLine === false);
    sync();
    win.addEventListener('online', sync);
    win.addEventListener('offline', sync);
    destroyRef.onDestroy(() => {
      win.removeEventListener('online', sync);
      win.removeEventListener('offline', sync);
    });
  }
}
