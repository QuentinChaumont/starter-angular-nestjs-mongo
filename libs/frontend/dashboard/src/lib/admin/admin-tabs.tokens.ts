import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';

/** One tab in the `/app/admin` sub-navigation. */
export interface AdminTab {
  /** Fallback label (used when `labelKey` is unset or i18n isn't installed). */
  label: string;
  /** Transloco key — takes precedence over `label`. */
  labelKey?: string;
  /** Path relative to `/app/admin`. `''` is the index tab. */
  path: string;
  /** Lower sorts first; ties keep registration order. Default `0`. */
  order?: number;
}

/**
 * Multi-provider: each admin brick contributes its tab with
 * `provideAdminTab(...)` in `app.config.ts`, so no brick has to patch a
 * shared list. `AdminTabsShell` reads them, sorted by `order`.
 */
export const ADMIN_TABS = new InjectionToken<AdminTab[]>('ADMIN_TABS');

export function provideAdminTab(tab: AdminTab): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ADMIN_TABS, multi: true, useValue: tab },
  ]);
}
