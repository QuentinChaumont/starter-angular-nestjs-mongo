import { NavItem } from '@org/frontend-dashboard';

/** Sidenav menu for the dashboard shell — edit for this project. */
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
