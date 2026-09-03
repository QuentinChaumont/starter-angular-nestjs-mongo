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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LangSwitcher } from '@org/frontend-i18n';
import { filter, map, of, switchMap, timer } from 'rxjs';
import { SidenavNav } from './sidenav-nav';
import { UserMenu } from './user-menu';

/** Don't flash the bar for navigations that resolve almost instantly. */
const PROGRESS_DELAY_MS = 150;

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
    MatProgressBarModule,
    RouterOutlet,
    SidenavNav,
    UserMenu,
    LangSwitcher,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (navigating()) {
      <mat-progress-bar
        class="shell__progress"
        mode="indeterminate"
        aria-label="Loading"
      ></mat-progress-bar>
    }
    <mat-toolbar class="shell__bar">
      <button
        mat-icon-button
        class="shell__toggle"
        (click)="toggle()"
        [attr.aria-label]="'dashboard.toggleNav' | transloco"
      >
        <mat-icon>{{ opened() ? 'menu_open' : 'menu' }}</mat-icon>
      </button>
      <span class="shell__brand">
        <span class="shell__mark" aria-hidden="true">◆</span>
        <span class="shell__title">{{ title }}</span>
      </span>
      <span class="shell__spacer"></span>
      <lib-lang-switcher></lib-lang-switcher>
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
    .shell__progress {
      position: fixed;
      inset-block-start: 0;
      inset-inline: 0;
      z-index: 1001;
      --mdc-linear-progress-track-height: 2px;
      --mdc-linear-progress-active-indicator-height: 2px;
    }
    .shell__bar {
      --mat-toolbar-standard-height: 48px;
      --mat-toolbar-mobile-height: 48px;
      block-size: 48px;
      min-block-size: 48px;
      padding-inline: 8px 12px;
      gap: 4px;
      background: var(--app-color-surface);
      color: var(--app-color-on-surface);
      border-block-end: var(--app-border-hairline);
    }
    .shell__toggle {
      color: color-mix(in srgb, var(--app-color-on-surface) 62%, transparent);
    }
    .shell__brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .shell__mark {
      font-size: 0.75rem;
      color: var(--app-color-primary);
    }
    .shell__title {
      font: 600 0.9375rem/1 var(--app-font-family);
      letter-spacing: -0.01em;
    }
    .shell__spacer {
      flex: 1;
    }
    .shell__container {
      flex: 1;
      background: var(--app-color-background);
    }
    .shell__nav {
      inline-size: 216px;
      background: var(--app-color-background);
      border-inline-end: var(--app-border-hairline);
    }
    .shell__content {
      padding: var(--app-space-5);
    }
    @media (max-width: 599.98px) {
      .shell__content {
        padding: var(--app-space-4) var(--app-space-3);
      }
    }
  `,
})
export class DashboardShell {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);

  protected readonly title = 'Dashboard';

  /**
   * `true` while a router navigation is in flight — but only once it has
   * been running for {@link PROGRESS_DELAY_MS}, so instant in-app moves
   * don't flash the bar. Any terminal navigation event clears it at once.
   */
  protected readonly navigating = toSignal(
    this.router.events.pipe(
      filter(
        (e) =>
          e instanceof NavigationStart ||
          e instanceof NavigationEnd ||
          e instanceof NavigationCancel ||
          e instanceof NavigationError,
      ),
      switchMap((e) =>
        e instanceof NavigationStart
          ? timer(PROGRESS_DELAY_MS).pipe(map(() => true))
          : of(false),
      ),
    ),
    { initialValue: false },
  );

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
