export { provideAuth } from './lib/provide-auth';
export { AuthService } from './lib/auth.service';
export { AuthStore } from './lib/auth.store';
export type { AuthStatus } from './lib/auth.store';
export { authGuard, roleGuard } from './lib/auth.guard';
export { authInterceptor } from './lib/auth.interceptor';
export { csrfInterceptor } from './lib/csrf.interceptor';
export { LoginPage } from './lib/login/login-page';
export { RegisterPage } from './lib/register/register-page';
export { OidcCallback } from './lib/callback/oidc-callback';

// auth-reset brick (V2.1 step 33) — wired by `nx g @org/starter-plugin:auth-reset`.
export * from './lib/reset/reset.service';
export * from './lib/reset/forgot-password-page';
export * from './lib/reset/reset-password-page';
export * from './lib/reset/verify-email-page';
export * from './lib/reset/verify-email-banner';
