export { provideDashboard } from './lib/provide-dashboard';
export { DASHBOARD_NAV, filterNavByRole } from './lib/nav.tokens';
export type { NavItem } from './lib/nav.tokens';
export { ADMIN_TABS, provideAdminTab } from './lib/admin/admin-tabs.tokens';
export type { AdminTab } from './lib/admin/admin-tabs.tokens';

// The routed shell components are reached only through their own lazy
// entry points (`@org/frontend-dashboard/shell` | `/home` | `/admin-tabs`),
// never this barrel — importing `provideDashboard` eagerly must not pull
// MatSidenav / MatList / MatMenu into the initial chunk.
