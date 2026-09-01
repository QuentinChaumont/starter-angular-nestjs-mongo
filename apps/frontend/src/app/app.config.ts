import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth } from '@org/frontend-auth';
import { provideDashboard } from '@org/frontend-dashboard';
import { materialProviders, provideTheme } from '@org/frontend-design';
import { appRoutes } from './app.routes';
import { DASHBOARD_NAV } from './dashboard-nav';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    ...materialProviders,
    provideTheme(),
    provideAuth(),
    provideDashboard(DASHBOARD_NAV),
  ],
};
