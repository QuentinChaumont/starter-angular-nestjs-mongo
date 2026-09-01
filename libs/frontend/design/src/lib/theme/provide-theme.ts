import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { ThemeService } from './theme.service';

/**
 * Instantiates {@link ThemeService} during bootstrap so the persisted
 * colour-scheme / overrides are applied to `<html>` before the first
 * render (no flash of the default charter). Spread into `app.config.ts`:
 *
 *   providers: [...materialProviders, provideTheme()]
 */
export function provideTheme(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ]);
}
