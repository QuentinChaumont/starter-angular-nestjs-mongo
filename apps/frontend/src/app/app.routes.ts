import { Route } from '@angular/router';
import { authGuard, roleGuard } from '@org/frontend-auth';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@org/frontend-auth').then((m) => m.LoginPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('@org/frontend-auth').then((m) => m.OidcCallback),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@org/frontend-dashboard').then((m) => m.DashboardShell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@org/frontend-dashboard').then((m) => m.DashboardHome),
      },
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('@org/frontend-dashboard').then((m) => m.DashboardHome),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'app' },
];
