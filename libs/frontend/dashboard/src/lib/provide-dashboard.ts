import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { DASHBOARD_NAV, NavItem } from './nav.tokens';

/**
 * Provides the sidenav menu for the dashboard shell:
 *
 *   providers: [..., provideDashboard(DASHBOARD_NAV)]
 */
export function provideDashboard(nav: NavItem[]): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: DASHBOARD_NAV, useValue: nav }]);
}
