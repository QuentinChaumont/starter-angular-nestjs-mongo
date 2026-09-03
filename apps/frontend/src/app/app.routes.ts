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
import {
  CookiePolicy,
  LegalNotice,
  PrivacyPolicy,
} from '@org/frontend-consent';
import {
  AdminTabsShell,
  DashboardHome,
  DashboardShell,
} from '@org/frontend-dashboard';
import { NotFoundPage } from './not-found.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPage, title: 'Sign in' },
  { path: 'register', component: RegisterPage, title: 'Create your account' },
  { path: 'auth/callback', component: OidcCallback, title: 'Signing in' },
  {
    path: 'forgot-password',
    component: ForgotPasswordPage,
    title: 'Reset your password',
  },
  {
    path: 'reset-password',
    component: ResetPasswordPage,
    title: 'Choose a new password',
  },
  { path: 'verify-email', component: VerifyEmailPage, title: 'Verify your email' },
  { path: 'legal/cookies', component: CookiePolicy, title: 'Cookie policy' },
  { path: 'legal/privacy', component: PrivacyPolicy, title: 'Privacy notice' },
  { path: 'legal/notice', component: LegalNotice, title: 'Legal notice' },
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
