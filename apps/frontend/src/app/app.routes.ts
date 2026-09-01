import { Route } from '@angular/router';

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
];
