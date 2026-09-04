import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';
import { NavItem } from '../nav.tokens';

const STORAGE_PREFIX = 'app.dashboard.nav-expanded.';

function storageKey(item: NavItem): string {
  return `${STORAGE_PREFIX}${item.route ?? item.label}`;
}

function readExpandedPref(key: string): boolean | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw === null ? null : raw === 'true';
  } catch {
    return null;
  }
}

function writeExpandedPref(key: string, expanded: boolean): void {
  try {
    globalThis.localStorage?.setItem(key, String(expanded));
  } catch {
    // storage unavailable — the preference just won't stick
  }
}

/** `/app` + the item's route, for comparison against `Router.url`. */
function navUrl(route: string | undefined): string {
  return route ? `/app/${route}` : '/app';
}

function matchesUrl(route: string | undefined, url: string): boolean {
  if (route === undefined) {
    return false;
  }
  const path = navUrl(route);
  return route === '' ? url === path : url === path || url.startsWith(`${path}/`);
}

/** Does `item`, or any of its descendants, own the current URL? */
function containsUrl(item: NavItem, url: string): boolean {
  if (matchesUrl(item.route, url)) {
    return true;
  }
  return (item.children ?? []).some((child) => containsUrl(child, url));
}

/**
 * One row of the sidenav tree — recursive, so it renders a nav of any
 * depth. A leaf (`children` unset) is a plain routed link. An item with
 * `children` renders as a collapsible group: a header button that only
 * toggles (its own `route`, if any, is ignored — put a landing page among
 * its `children` instead) plus its nested children, indented one level
 * when expanded. Expand state persists per item in
 * `localStorage`, and the branch holding the active route auto-expands the
 * first time it's seen (a later manual collapse — this session or a past
 * one — always wins over that).
 */
@Component({
  selector: 'lib-nav-tree-item',
  imports: [
    MatListModule,
    MatIconModule,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- recursive component referencing itself
    NavTreeItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item().children && item().children!.length > 0) {
      <button
        type="button"
        mat-list-item
        class="nav-tree__row nav-tree__row--group"
        [class.nav-tree__row--active]="descendantActive()"
        [style.--nav-depth]="depth()"
        [attr.aria-expanded]="expanded()"
        (click)="toggle()"
      >
        <mat-icon matListItemIcon>{{ item().icon }}</mat-icon>
        <span matListItemTitle>
          {{ item().labelKey ? (item().labelKey | transloco) : item().label }}
        </span>
        <mat-icon
          class="nav-tree__chevron"
          [class.nav-tree__chevron--open]="expanded()"
          aria-hidden="true"
        >
          chevron_right
        </mat-icon>
      </button>
      @if (expanded()) {
        <div class="nav-tree__group" role="group">
          @for (child of item().children; track child.route ?? child.label) {
            <lib-nav-tree-item
              [item]="child"
              [depth]="depth() + 1"
              (navigated)="navigated.emit()"
            />
          }
        </div>
      }
    } @else {
      <a
        mat-list-item
        class="nav-tree__row"
        [style.--nav-depth]="depth()"
        [routerLink]="linkPath()"
        routerLinkActive="nav-tree__row--active"
        [routerLinkActiveOptions]="{ exact: item().route === '' }"
        (click)="navigated.emit()"
      >
        <mat-icon matListItemIcon>{{ item().icon }}</mat-icon>
        <span matListItemTitle>
          {{ item().labelKey ? (item().labelKey | transloco) : item().label }}
        </span>
      </a>
    }
  `,
  styles: `
    .nav-tree__row {
      margin-block: 1px;
      border-radius: var(--app-radius-md);
      padding-inline-start: calc(var(--nav-depth, 0) * 16px);
      inline-size: 100%;
      text-align: start;
    }
    .nav-tree__row:hover {
      background: color-mix(
        in srgb,
        var(--app-color-on-surface) 6%,
        transparent
      );
    }
    .nav-tree__row--active {
      background: var(--app-color-surface-variant);
      box-shadow: inset 2px 0 0 var(--app-color-primary);
      --mat-list-list-item-label-text-color: var(--app-color-primary);
      --mat-list-list-item-label-text-weight: 600;
      --mat-list-list-item-leading-icon-color: var(--app-color-primary);
    }
    .nav-tree__row--group {
      --mat-list-list-item-trailing-icon-color: color-mix(
        in srgb,
        var(--app-color-on-surface) 45%,
        transparent
      );
    }
    .nav-tree__chevron {
      transition: transform 0.15s ease;
    }
    .nav-tree__chevron--open {
      transform: rotate(90deg);
    }
    .nav-tree__group {
      display: block;
    }
  `,
})
export class NavTreeItem {
  private readonly router = inject(Router);

  readonly item = input.required<NavItem>();
  readonly depth = input(0);

  /** Emitted when a link is clicked — the shell closes the drawer on mobile. */
  readonly navigated = output<void>();

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly linkPath = computed(() => {
    const route = this.item().route;
    return route ? ['/app', ...route.split('/')] : ['/app'];
  });

  protected readonly descendantActive = computed(() =>
    containsUrl(this.item(), this.currentUrl()),
  );

  private readonly manualOverride = signal<boolean | null>(null);
  private readonly storedOverride = computed(() =>
    readExpandedPref(storageKey(this.item())),
  );

  protected readonly expanded = computed(
    () =>
      this.manualOverride() ??
      this.storedOverride() ??
      this.descendantActive(),
  );

  protected toggle(): void {
    const next = !this.expanded();
    this.manualOverride.set(next);
    writeExpandedPref(storageKey(this.item()), next);
  }
}
