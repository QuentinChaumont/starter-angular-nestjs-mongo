import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { CONSENT_MANAGER } from '@org/frontend-core';
import {
  CONSENT_CONFIG,
  ConsentConfig,
  mergeConsentConfig,
} from './consent.config';
import { ConsentService } from './consent.service';

/**
 * Wires the consent brick:
 *
 *   providers: [..., provideConsent()]
 *
 * Optionally override the config (`policyVersion`, `categories`, legal
 * routes, …). Exposes `ConsentService` through the neutral
 * `CONSENT_MANAGER` hook so a shell can offer "Manage cookies" without
 * depending on this brick, and instantiates the service at bootstrap so
 * the banner's visibility is settled before the first paint.
 */
export function provideConsent(
  config?: Partial<ConsentConfig>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    config
      ? { provide: CONSENT_CONFIG, useValue: mergeConsentConfig(config) }
      : [],
    { provide: CONSENT_MANAGER, useExisting: ConsentService },
    provideAppInitializer(() => {
      inject(ConsentService);
    }),
  ]);
}
