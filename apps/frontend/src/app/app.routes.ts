import { Route } from '@angular/router';
import {
  LoginPage,
  OidcCallback,
  RegisterPage,
  authGuard,
  roleGuard,
} from '@org/frontend-auth';
import { CookiePolicy, PrivacyPolicy } from '@org/frontend-consent';
import { DashboardHome, DashboardShell } from '@org/frontend-dashboard';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'auth/callback', component: OidcCallback },
  { path: 'legal/cookies', component: CookiePolicy },
  { path: 'legal/privacy', component: PrivacyPolicy },
  {
    path: 'app',
    canActivate: [authGuard],
    component: DashboardShell,
    children: [
      { path: '', component: DashboardHome },
      { path: 'admin', canActivate: [roleGuard('admin')], component: DashboardHome },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'app' },
];
