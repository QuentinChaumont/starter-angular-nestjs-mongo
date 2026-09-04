import { Route } from '@angular/router';
import { AUTH_ROUTES, RESET_ROUTES, authGuard, roleGuard } from '@org/frontend-auth';
import { LEGAL_ROUTES } from '@org/frontend-consent';
import {
  AdminTabsShell,
  DashboardHome,
  DashboardShell,
} from '@org/frontend-dashboard';
import { NotFoundPage } from './not-found.component';

export const appRoutes: Route[] = [
  ...AUTH_ROUTES,
  ...RESET_ROUTES,
  { path: 'legal', children: LEGAL_ROUTES },
  {
    path: 'app',
    canActivate: [authGuard],
    component: DashboardShell,
    children: [
      { path: '', component: DashboardHome, title: 'Home' },
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        component: AdminTabsShell,
        title: 'Admin',
        children: [
          {
            path: '',
            loadChildren: () =>
              import('@org/frontend-features-admin-users').then(
                (m) => m.ADMIN_USERS_ROUTES,
              ),
          },
          {
            path: 'roles',
            loadChildren: () =>
              import('@org/frontend-features-admin-roles').then(
                (m) => m.ADMIN_ROLES_ROUTES,
              ),
          },
          {
            path: 'audit',
            loadChildren: () =>
              import('@org/frontend-features-admin-audit').then(
                (m) => m.ADMIN_AUDIT_ROUTES,
              ),
          },
        ],
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('@org/frontend-features-profile').then((m) => m.PROFILE_ROUTES),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  { path: '**', component: NotFoundPage, title: 'Page not found' },
];
