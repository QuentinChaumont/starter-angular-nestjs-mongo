import { InjectionToken } from '@angular/core';

export interface NavItem {
  label: string;
  /** `mat-icon` ligature name. */
  icon: string;
  /** Path relative to `/app` (`''` for the landing route). May be nested
   * (`'admin/roles'`) — split into segments for the router link. */
  route: string;
  /** If set, the entry shows only for a user holding one of these roles. */
  roles?: string[];
}

/**
 * The sidenav menu. The shell knows nothing else about the app's features —
 * provide the list with `provideDashboard([...])`.
 */
export const DASHBOARD_NAV = new InjectionToken<NavItem[]>('DASHBOARD_NAV', {
  factory: () => [],
});
