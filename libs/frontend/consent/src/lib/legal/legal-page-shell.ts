import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

/**
 * Shared chrome for the three `/legal/*` pages: the brand mark, a back
 * link, the document title, and a `.panel`-styled reading surface sized
 * for prose. Keeps the back-navigation logic and layout in one place
 * instead of three near-identical copies.
 */
@Component({
  selector: 'lib-legal-page-shell',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legal-shell">
      <div class="legal-shell__brand">
        <span class="legal-shell__mark" aria-hidden="true">◆</span>
        <span class="legal-shell__name">Starter</span>
      </div>
      <button mat-button class="legal-shell__back" (click)="back()">
        <mat-icon>arrow_back</mat-icon> Back
      </button>
      <article class="legal legal-shell__panel">
        <h1>{{ heading() }}</h1>
        <ng-content />
      </article>
    </div>
  `,
  styles: `
    .legal-shell {
      max-width: 720px;
      margin: var(--app-space-6) auto;
      padding: 0 var(--app-space-4) var(--app-space-6);
      display: flex;
      flex-direction: column;
      gap: var(--app-space-3);
    }
    .legal-shell__brand {
      display: flex;
      align-items: center;
      gap: var(--app-space-2);
    }
    .legal-shell__mark {
      font-size: 0.875rem;
      color: var(--app-color-primary);
    }
    .legal-shell__name {
      font: 600 0.9375rem/1 var(--app-font-family);
      letter-spacing: -0.01em;
      color: var(--app-color-on-surface);
    }
    .legal-shell__back {
      inline-size: fit-content;
      color: color-mix(in srgb, var(--app-color-on-surface) 70%, transparent);
    }
    .legal-shell__panel {
      background: var(--app-color-surface);
      border: var(--app-border-hairline);
      border-radius: var(--app-radius-lg);
      padding: var(--app-space-6);
      max-inline-size: 70ch;
    }
    .legal-shell__panel h1 {
      margin: 0 0 var(--app-space-2);
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
  `,
})
export class LegalPageShell {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly heading = input.required<string>();

  /** Go back if we got here from within the app; otherwise (direct link /
   * new tab, where `history.length` is 1) head to the app root. */
  protected back(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }
}
