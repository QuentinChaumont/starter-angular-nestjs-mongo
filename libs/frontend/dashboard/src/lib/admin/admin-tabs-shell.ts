import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ADMIN_TABS, AdminTab } from './admin-tabs.tokens';

/**
 * `/app/admin` frame: a slim tab strip over a routed outlet. The tabs come
 * from the `ADMIN_TABS` multi-provider — each admin brick registers its
 * own — so there's a single "Admin" entry in the sidenav and the consoles
 * group under it. Renders just the outlet when only one tab (or none) is
 * present. Plain links, not `MatTabNav`, to keep it out of the eager
 * bundle's weight and match the console's understated chrome.
 */
@Component({
  selector: 'lib-admin-tabs-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tabs.length > 1) {
      <nav class="admin-tabs" aria-label="Admin sections">
        @for (tab of tabs; track tab.path) {
          <a
            class="admin-tabs__tab"
            [routerLink]="
              tab.path ? ['/app', 'admin', tab.path] : ['/app', 'admin']
            "
            routerLinkActive="admin-tabs__tab--active"
            [routerLinkActiveOptions]="{ exact: tab.path === '' }"
          >
            {{ tab.labelKey ? (tab.labelKey | transloco) : tab.label }}
          </a>
        }
      </nav>
    }
    <router-outlet></router-outlet>
  `,
  styles: `
    .admin-tabs {
      display: flex;
      gap: var(--app-space-1);
      margin-block-end: var(--app-space-4);
      border-block-end: var(--app-border-hairline);
    }
    .admin-tabs__tab {
      padding: 8px 12px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
      text-decoration: none;
      border-block-end: 2px solid transparent;
      margin-block-end: -1px;
    }
    .admin-tabs__tab:hover {
      color: var(--app-color-on-surface);
    }
    .admin-tabs__tab--active {
      color: var(--app-color-primary);
      border-block-end-color: var(--app-color-primary);
    }
  `,
})
export class AdminTabsShell {
  protected readonly tabs: AdminTab[] = [
    ...(inject(ADMIN_TABS, { optional: true }) ?? []),
  ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
