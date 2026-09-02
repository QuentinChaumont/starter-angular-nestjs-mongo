import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { map, of, switchMap, tap } from 'rxjs';
import {
  AuthService,
  AuthStore,
  authInterceptor,
  csrfInterceptor,
  provideAuth,
} from '@org/frontend-auth';
import { provideConsent } from '@org/frontend-consent';
import { ME_ENDPOINT, SESSION_CONTROL } from '@org/frontend-core';
import { provideDashboard } from '@org/frontend-dashboard';
import { materialProviders, provideTheme } from '@org/frontend-design';
import {
  DialogService,
  httpErrorInterceptor,
  provideFeedback,
} from '@org/frontend-feedback';
import { appRoutes } from './app.routes';
import { DASHBOARD_NAV } from './dashboard-nav';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([
        csrfInterceptor,
        authInterceptor,
        httpErrorInterceptor,
      ]),
    ),
    ...materialProviders,
    provideTheme(),
    provideAuth(),
    provideFeedback(),
    provideConsent(),
    provideDashboard(DASHBOARD_NAV),
    // Profile brick (V2.1 step 34): point loadMe() at the full /users/me.
    { provide: ME_ENDPOINT, useValue: '/users/me' },
    // Lets the cookie-preferences dialog offer "turn off the session
    // cookie" — confirm, then log out and clear the cookies.
    {
      provide: SESSION_CONTROL,
      useFactory: () => {
        const store = inject(AuthStore);
        const auth = inject(AuthService);
        const router = inject(Router);
        const dialog = inject(DialogService);
        return {
          isActive: () => store.isAuthenticated(),
          end: () =>
            dialog
              .confirm({
                title: 'Turn off the session cookie?',
                message:
                  'This clears your session on this device and signs you out.',
                confirmLabel: 'Sign out',
                cancelLabel: 'Keep me signed in',
                danger: true,
              })
              .pipe(
                switchMap((ok) =>
                  ok
                    ? auth.logout().pipe(
                        tap(() => void router.navigate(['/login'])),
                        map(() => true),
                      )
                    : of(false),
                ),
              ),
        };
      },
    },
  ],
};
