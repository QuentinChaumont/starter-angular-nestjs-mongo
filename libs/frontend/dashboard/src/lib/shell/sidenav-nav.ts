import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '@org/frontend-auth';
import { DASHBOARD_NAV } from '../nav.tokens';

/** Renders `DASHBOARD_NAV`, filtered by the current user's roles. */
@Component({
  selector: 'lib-sidenav-nav',
  imports: [MatListModule, MatIconModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav">
      <p class="nav__eyebrow">Navigation</p>
      <mat-nav-list class="nav__list">
        @for (item of items(); track item.route) {
          <a
            mat-list-item
            class="nav__item"
            [routerLink]="
              item.route ? ['/app', ...item.route.split('/')] : ['/app']
            "
            routerLinkActive="active-link"
            [routerLinkActiveOptions]="{ exact: item.route === '' }"
            (click)="navigated.emit()"
          >
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            <span matListItemTitle>{{ item.label }}</span>
          </a>
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
    .nav__item {
      margin-block: 1px;
      border-radius: var(--app-radius-md);
    }
    .nav__item:hover {
      background: color-mix(
        in srgb,
        var(--app-color-on-surface) 6%,
        transparent
      );
    }
    .active-link.nav__item {
      background: var(--app-color-surface-variant);
      box-shadow: inset 2px 0 0 var(--app-color-primary);
      --mat-list-list-item-label-text-color: var(--app-color-primary);
      --mat-list-list-item-label-text-weight: 600;
      --mat-list-list-item-leading-icon-color: var(--app-color-primary);
    }
  `,
})
export class SidenavNav {
  private readonly nav = inject(DASHBOARD_NAV);
  private readonly store = inject(AuthStore);

  /** Emitted when a link is clicked — the shell closes the drawer on mobile. */
  readonly navigated = output<void>();

  protected readonly items = computed(() => {
    const roles = this.store.user()?.roles ?? [];
    return this.nav.filter(
      (item) => !item.roles || item.roles.some((role) => roles.includes(role)),
    );
  });
}
