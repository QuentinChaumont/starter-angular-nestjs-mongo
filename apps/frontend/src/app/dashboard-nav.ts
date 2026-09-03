import { NavItem } from '@org/frontend-dashboard';

/** Sidenav menu for the dashboard shell — edit for this project. */
export const DASHBOARD_NAV: NavItem[] = [
  { label: 'Home', icon: 'home', route: '' },
  { label: 'Admin', icon: 'shield', route: 'admin', roles: ['admin'] },
  {
    label: 'Roles',
    icon: 'key',
    route: 'admin/roles',
    roles: ['admin'],
  },
  {
    label: 'Audit',
    icon: 'receipt_long',
    route: 'admin/audit',
    roles: ['admin'],
  },
];
