import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth } from '@org/frontend-auth';
import { materialProviders, provideTheme } from '@org/frontend-design';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    ...materialProviders,
    provideTheme(),
    provideAuth(),
  ],
};
