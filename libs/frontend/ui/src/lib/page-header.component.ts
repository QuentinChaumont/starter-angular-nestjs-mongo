import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The heading strip at the top of a console page: a title, an optional
 * subtitle, and a right-aligned `actions` slot. Replaces the copy-pasted
 * `.*__toolbar` headers across the admin and profile pages.
 *
 * ```html
 * <lib-page-header title="Roles" subtitle="The catalogue to assign from.">
 *   <button mat-flat-button color="primary" actions (click)="create()">
 *     New role
 *   </button>
 * </lib-page-header>
 * ```
 *
 * An optional `breadcrumbs` slot renders above the title for nested pages.
 */
@Component({
  selector: 'lib-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <ng-content select="[breadcrumbs]"></ng-content>
      <div class="page-header__bar">
        <div class="page-header__heading">
          <h1 class="page-header__title">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="page-header__subtitle">{{ subtitle() }}</p>
          }
        </div>
        <div class="page-header__actions">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-2);
      padding-block-end: var(--app-space-3);
      border-block-end: var(--app-border-hairline);
    }
    .page-header__bar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--app-space-4);
    }
    .page-header__title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .page-header__subtitle {
      margin: 3px 0 0;
      font-size: 0.8125rem;
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
    }
    .page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--app-space-2);
      flex-shrink: 0;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
