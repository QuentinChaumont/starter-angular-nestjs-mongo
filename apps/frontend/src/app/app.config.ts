import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  authInterceptor,
  csrfInterceptor,
  provideAuth,
} from '@org/frontend-auth';
import { provideConsent } from '@org/frontend-consent';
import { ME_ENDPOINT } from '@org/frontend-core';
import { provideDashboard } from '@org/frontend-dashboard';
import { materialProviders, provideTheme } from '@org/frontend-design';
import { httpErrorInterceptor, provideFeedback } from '@org/frontend-feedback';
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
  ],
};
