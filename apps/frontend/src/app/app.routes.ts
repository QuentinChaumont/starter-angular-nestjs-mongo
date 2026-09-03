import { Route } from '@angular/router';
import {
  ForgotPasswordPage,
  LoginPage,
  OidcCallback,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
  authGuard,
  roleGuard,
} from '@org/frontend-auth';
import { CookiePolicy, PrivacyPolicy } from '@org/frontend-consent';
import {
  AdminTabsShell,
  DashboardHome,
  DashboardShell,
} from '@org/frontend-dashboard';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'auth/callback', component: OidcCallback },
  { path: 'forgot-password', component: ForgotPasswordPage },
  { path: 'reset-password', component: ResetPasswordPage },
  { path: 'verify-email', component: VerifyEmailPage },
  { path: 'legal/cookies', component: CookiePolicy },
  { path: 'legal/privacy', component: PrivacyPolicy },
  {
    path: 'app',
    canActivate: [authGuard],
    component: DashboardShell,
    children: [
      { path: '', component: DashboardHome },
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        component: AdminTabsShell,
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
];
