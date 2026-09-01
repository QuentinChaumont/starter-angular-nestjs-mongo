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
    <mat-nav-list>
      @for (item of items(); track item.route) {
        <a
          mat-list-item
          [routerLink]="['/app', item.route]"
          routerLinkActive="active-link"
          [routerLinkActiveOptions]="{ exact: item.route === '' }"
          (click)="navigated.emit()"
        >
          <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
          <span matListItemTitle>{{ item.label }}</span>
        </a>
      }
    </mat-nav-list>
  `,
  styles: `
    .active-link {
      --mat-list-list-item-container-color: var(--app-color-surface-variant);
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
