import { InjectionToken } from '@angular/core';

export interface NavItem {
  /** Fallback label, used when `labelKey` is unset or i18n isn't installed. */
  label: string;
  /** Transloco key (V2.3 step 47) — takes precedence over `label`. */
  labelKey?: string;
  /** `mat-icon` ligature name. */
  icon: string;
  /**
   * Path relative to `/app` (`''` for the landing route). May be nested
   * (`'admin/roles'`) — split into segments for the router link. Ignored
   * on a group item (one with `children` set) — its header only
   * expands/collapses, it never navigates; put a landing page for the
   * group among its `children` instead.
   */
  route?: string;
  /** If set, the entry shows only for a user holding one of these roles. */
  roles?: string[];
  /**
   * Nested entries, rendered as a collapsible group (Lens-style: a header
   * row that only toggles, never navigates — its children are the links).
   * Expand state persists per item in `localStorage` and the branch
   * containing the active route auto-expands on load.
   */
  children?: NavItem[];
}

/**
 * The sidenav menu. The shell knows nothing else about the app's features —
 * provide the list with `provideDashboard([...])`.
 */
export const DASHBOARD_NAV = new InjectionToken<NavItem[]>('DASHBOARD_NAV', {
  factory: () => [],
});

function hasOwnRole(item: NavItem, roles: readonly string[]): boolean {
  return !item.roles || item.roles.some((role) => roles.includes(role));
}

/**
 * Recursively filters a nav tree by the current user's roles: a role-gated
 * item (or group) is dropped unless the user holds one of its roles, and a
 * group left with no visible children is dropped too — its header never
 * navigates on its own, so there'd be nothing left for it to do. Pure —
 * exported for testing and for anything that wants the same rule (e.g. a
 * breadcrumb trail).
 */
export function filterNavByRole(
  items: readonly NavItem[],
  roles: readonly string[],
): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    if (!hasOwnRole(item, roles)) {
      continue;
    }
    if (item.children) {
      const children = filterNavByRole(item.children, roles);
      if (children.length === 0) {
        continue;
      }
      result.push({ ...item, children });
    } else {
      result.push(item);
    }
  }
  return result;
}
