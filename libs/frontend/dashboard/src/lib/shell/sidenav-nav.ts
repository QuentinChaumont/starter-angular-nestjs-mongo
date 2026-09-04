import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { AuthStore } from '@org/frontend-auth';
import { DASHBOARD_NAV, filterNavByRole } from '../nav.tokens';
import { NavTreeItem } from './nav-tree-item';

/**
 * Renders `DASHBOARD_NAV`, filtered by the current user's roles — a tree
 * of {@link NavTreeItem} rows, one per root entry. An entry with
 * `children` renders as a collapsible group (Lens-style); everything else
 * is a plain routed link. See `NavItem` for the shape.
 */
@Component({
  selector: 'lib-sidenav-nav',
  imports: [MatListModule, NavTreeItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav">
      <p class="nav__eyebrow">Navigation</p>
      <mat-nav-list class="nav__list">
        @for (item of items(); track item.route ?? item.label) {
          <lib-nav-tree-item [item]="item" (navigated)="navigated.emit()" />
        }
      </mat-nav-list>
    </nav>
  `,
  styles: `
    .nav {
      padding: var(--app-space-3) var(--app-space-2);
    }
    .nav__eyebrow {
      margin: 4px 0 8px;
      padding-inline: 10px;
      font: 600 0.6875rem/1 var(--app-font-mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--app-color-on-surface) 45%, transparent);
    }
    .nav__list {
      --mat-list-list-item-one-line-container-height: 34px;
      --mat-list-list-item-leading-icon-size: 18px;
      --mat-list-list-item-label-text-size: 0.8125rem;
      --mat-list-list-item-label-text-weight: 500;
      --mat-list-list-item-leading-icon-start-space: 10px;
      --mat-list-list-item-leading-icon-end-space: 10px;
      --mat-list-list-item-label-text-color: color-mix(
        in srgb,
        var(--app-color-on-surface) 78%,
        transparent
      );
      --mat-list-list-item-leading-icon-color: color-mix(
        in srgb,
        var(--app-color-on-surface) 52%,
        transparent
      );
      padding: 0;
    }
  `,
})
export class SidenavNav {
  private readonly nav = inject(DASHBOARD_NAV);
  private readonly store = inject(AuthStore);

  /** Emitted when a link is clicked — the shell closes the drawer on mobile. */
  readonly navigated = output<void>();

  protected readonly items = computed(() =>
    filterNavByRole(this.nav, this.store.user()?.roles ?? []),
  );
}
