import { Route } from '@angular/router';

/**
 * The unauthenticated auth pages, each lazily loaded into its own chunk.
 * Exported instead of the page components so that importing `AuthService`
 * / `authGuard` eagerly doesn't pull the pages (and `MatFormField` etc.)
 * into the initial bundle.
 *
 * Spread into `appRoutes`: `[...AUTH_ROUTES, ...]`. The `auth-reset` brick
 * adds `RESET_ROUTES` (forgot / reset / verify) alongside.
 */
export const AUTH_ROUTES: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./login/login-page').then((m) => m.LoginPage),
    title: 'Sign in',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register-page').then((m) => m.RegisterPage),
    title: 'Create your account',
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./callback/oidc-callback').then((m) => m.OidcCallback),
    title: 'Signing in',
  },
];
