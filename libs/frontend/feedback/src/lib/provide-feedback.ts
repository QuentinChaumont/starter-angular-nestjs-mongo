import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import {
  EnvironmentProviders,
  ErrorHandler,
  makeEnvironmentProviders,
} from '@angular/core';
import { GlobalErrorHandler } from './global-error-handler';

/**
 * Feedback brick defaults (shared dialog sizing / focus behaviour). The
 * `httpErrorInterceptor` is registered by the app in its
 * `provideHttpClient(withInterceptors([...]))` — after `authInterceptor` —
 * so it stays in one place with the other interceptors.
 *
 *   providers: [
 *     provideHttpClient(withInterceptors([csrfInterceptor, authInterceptor, httpErrorInterceptor])),
 *     provideFeedback(),
 *   ]
 *
 * Also installs {@link GlobalErrorHandler} — a toast + Reload action for
 * runtime errors Angular would otherwise only log.
 */
export function provideFeedback(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        width: '420px',
        maxWidth: '90vw',
        autoFocus: 'dialog',
        restoreFocus: true,
      },
    },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ]);
}
