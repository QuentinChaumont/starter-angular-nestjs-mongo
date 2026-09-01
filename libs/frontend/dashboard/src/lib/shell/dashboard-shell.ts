import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { SidenavNav } from './sidenav-nav';
import { UserMenu } from './user-menu';

const COMPACT_QUERY = '(max-width: 959.98px)';
const OPEN_PREF_KEY = 'app.dashboard.sidenav-open';

function readOpenPref(): boolean {
  try {
    return globalThis.localStorage?.getItem(OPEN_PREF_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeOpenPref(open: boolean): void {
  try {
    globalThis.localStorage?.setItem(OPEN_PREF_KEY, String(open));
  } catch {
    // storage unavailable — the preference just won't stick
  }
}

/**
 * Default layout for the authenticated area: a top toolbar and a responsive
 * sidenav (`side` on desktop, `over` on mobile) wrapping the routed content.
 * Knows only `DASHBOARD_NAV` — never a business feature.
 */
@Component({
  selector: 'lib-dashboard-shell',
  imports: [
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    RouterOutlet,
    SidenavNav,
    UserMenu,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar color="primary" class="shell__bar">
      <button mat-icon-button (click)="toggle()" aria-label="Toggle navigation">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="shell__title">{{ title }}</span>
      <span class="shell__spacer"></span>
      <lib-user-menu></lib-user-menu>
    </mat-toolbar>

    <mat-sidenav-container class="shell__container">
      <mat-sidenav
        class="shell__nav"
        [mode]="compact() ? 'over' : 'side'"
        [opened]="opened()"
        (closedStart)="onSidenavClosed()"
      >
        <lib-sidenav-nav (navigated)="onNavigated()"></lib-sidenav-nav>
      </mat-sidenav>

      <mat-sidenav-content class="shell__content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .shell__title {
      font: 500 1.125rem/1 var(--app-font-family);
    }
    .shell__spacer {
      flex: 1;
    }
    .shell__container {
      flex: 1;
    }
    .shell__nav {
      inline-size: 240px;
      border-inline-end: 1px solid var(--app-color-outline);
    }
    .shell__content {
      padding: 24px;
    }
  `,
})
export class DashboardShell {
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly title = 'Dashboard';

  protected readonly compact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  private readonly desktopOpen = signal(readOpenPref());
  private readonly mobileOpen = signal(false);

  protected readonly opened = computed(() =>
    this.compact() ? this.mobileOpen() : this.desktopOpen(),
  );

  protected toggle(): void {
    if (this.compact()) {
      this.mobileOpen.update((v) => !v);
    } else {
      const next = !this.desktopOpen();
      this.desktopOpen.set(next);
      writeOpenPref(next);
    }
  }

  protected onNavigated(): void {
    if (this.compact()) {
      this.mobileOpen.set(false);
    }
  }

  protected onSidenavClosed(): void {
    // Keep our state in sync when Material closes the drawer (backdrop / esc).
    if (this.compact()) {
      this.mobileOpen.set(false);
    } else if (this.desktopOpen()) {
      this.desktopOpen.set(false);
      writeOpenPref(false);
    }
  }
}
