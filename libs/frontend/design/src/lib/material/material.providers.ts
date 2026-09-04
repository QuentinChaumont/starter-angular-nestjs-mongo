import { EnvironmentProviders, Provider } from '@angular/core';
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
 * app's zoneless change detection. Snack bars auto-dismiss after 4s.
 *
 * `<mat-form-field>` appearance is **not** defaulted here — that would pull
 * `@angular/material/form-field` (~55 kB) into the initial bundle for a
 * one-word default. Every field in the starter sets `appearance="outline"`
 * explicitly instead.
 */
export const materialProviders: (Provider | EnvironmentProviders)[] = [
  provideAnimationsAsync(),
  {
    provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
    useValue: { duration: SNACK_BAR_DURATION_MS },
  },
];
