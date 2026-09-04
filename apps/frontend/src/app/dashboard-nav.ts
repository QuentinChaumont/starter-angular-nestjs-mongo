import { NavItem } from '@org/frontend-dashboard';

/**
 * Sidenav menu for the dashboard shell — edit for this project. `Admin`
 * stays a flat link: `/app/admin` already has its own sub-navigation (the
 * tab strip from `AdminTabsShell` — see `frontend-dashboard`'s README),
 * so mirroring "Roles" / "Audit" here too would just duplicate it.
 *
 * Give any entry a `children` array to turn it into a collapsible group
 * instead (Lens-style: the header row toggles, children navigate) — e.g.:
 *
 *   {
 *     label: 'Reports', icon: 'bar_chart',
 *     children: [
 *       { label: 'Sales', icon: 'point_of_sale', route: 'reports/sales' },
 *       { label: 'Usage', icon: 'query_stats', route: 'reports/usage' },
 *     ],
 *   }
 *
 * See `NavItem` in `@org/frontend-dashboard` for the full shape.
 */
export const DASHBOARD_NAV: NavItem[] = [
  { label: 'Home', labelKey: 'dashboard.nav.home', icon: 'home', route: '' },
  {
    label: 'Admin',
    labelKey: 'dashboard.nav.admin',
    icon: 'shield',
    route: 'admin',
    roles: ['admin'],
  },
];
