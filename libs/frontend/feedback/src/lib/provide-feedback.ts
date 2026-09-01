import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

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
  ]);
}
