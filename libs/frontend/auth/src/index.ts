export { provideAuth } from './lib/provide-auth';
export { AuthService } from './lib/auth.service';
export { AuthStore } from './lib/auth.store';
export type { AuthStatus } from './lib/auth.store';
export { authGuard, roleGuard } from './lib/auth.guard';
export { authInterceptor } from './lib/auth.interceptor';
export { csrfInterceptor } from './lib/csrf.interceptor';
export { AUTH_ROUTES } from './lib/auth.routes';

// auth-reset brick (V2.1 step 33) — wired by `nx g @org/starter-plugin:auth-reset`.
export * from './lib/reset/reset.service';
export * from './lib/reset/reset.routes';
export * from './lib/reset/verify-email-banner';
