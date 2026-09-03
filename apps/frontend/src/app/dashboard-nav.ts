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
  {
    label: 'Roles',
    labelKey: 'dashboard.nav.roles',
    icon: 'key',
    route: 'admin/roles',
    roles: ['admin'],
  },
  {
    label: 'Audit',
    labelKey: 'dashboard.nav.audit',
    icon: 'receipt_long',
    route: 'admin/audit',
    roles: ['admin'],
  },
];
