import { EnvironmentProviders, Provider } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

const SNACK_BAR_DURATION_MS = 4000;

/**
 * Everything Angular Material needs at bootstrap, in one spot. Spread into
 * `apps/frontend/src/app/app.config.ts`:
 *
 *   providers: [...existing, ...materialProviders]
 *
 * Animations are loaded lazily (`provideAnimationsAsync`) — friendly to the
 * app's zoneless change detection. Form fields default to the `outline`
 * appearance; snack bars to a 4s auto-dismiss.
 */
export const materialProviders: (Provider | EnvironmentProviders)[] = [
  provideAnimationsAsync(),
  {
    provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
    useValue: { appearance: 'outline' as const },
  },
  {
    provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
    useValue: { duration: SNACK_BAR_DURATION_MS },
  },
];
