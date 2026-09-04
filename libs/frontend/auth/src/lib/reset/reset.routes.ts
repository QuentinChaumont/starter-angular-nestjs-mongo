import { Route } from '@angular/router';

/**
 * The `auth-reset` brick's pages (forgot password / reset / verify email),
 * each lazily loaded. Spread into `appRoutes` after `AUTH_ROUTES`.
 */
export const RESET_ROUTES: Route[] = [
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password-page').then((m) => m.ForgotPasswordPage),
    title: 'Reset your password',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password-page').then((m) => m.ResetPasswordPage),
    title: 'Choose a new password',
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email-page').then((m) => m.VerifyEmailPage),
    title: 'Verify your email',
  },
];
