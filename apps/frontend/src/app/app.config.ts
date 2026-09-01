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
      withInterceptors([csrfInterceptor, authInterceptor, httpErrorInterceptor]),
    ),
    ...materialProviders,
    provideTheme(),
    provideAuth(),
    provideFeedback(),
    provideDashboard(DASHBOARD_NAV),
  ],
};
