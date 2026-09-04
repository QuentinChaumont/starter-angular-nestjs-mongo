import { Route } from '@angular/router';
import { AUTH_ROUTES, RESET_ROUTES, authGuard, roleGuard } from '@org/frontend-auth';
import { LEGAL_ROUTES } from '@org/frontend-consent';
import { NotFoundPage } from './not-found.component';

export const appRoutes: Route[] = [
  ...AUTH_ROUTES,
  ...RESET_ROUTES,
  { path: 'legal', children: LEGAL_ROUTES },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@org/frontend-dashboard/shell').then((m) => m.DashboardShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@org/frontend-dashboard/home').then((m) => m.DashboardHome),
        title: 'Home',
      },
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('@org/frontend-dashboard/admin-tabs').then(
            (m) => m.AdminTabsShell,
          ),
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
