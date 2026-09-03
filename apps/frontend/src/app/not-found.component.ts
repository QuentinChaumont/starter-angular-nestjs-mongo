import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Catch-all for unknown URLs — Angular otherwise throws
 * "Cannot match any routes" and renders nothing. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="not-found">
      <p class="not-found__code">404</p>
      <h1 class="not-found__title">Page not found</h1>
      <p class="not-found__text">
        The page you're looking for doesn't exist or has moved.
      </p>
      <a routerLink="/">Back to the app</a>
    </main>
  `,
  styles: `
    .not-found {
      max-width: 420px;
      margin: 16vh auto;
      padding: 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .not-found__code {
      margin: 0;
      font: 700 2.5rem/1 var(--app-font-mono, monospace);
      color: var(--app-color-primary, currentColor);
    }
    .not-found__title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .not-found__text {
      margin: 0 0 8px;
      color: color-mix(in srgb, currentColor 65%, transparent);
    }
  `,
})
export class NotFoundPage {}
