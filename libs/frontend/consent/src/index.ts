export { provideConsent } from './lib/provide-consent';
export { ConsentService } from './lib/consent.service';
export {
  CONSENT_CONFIG,
  DEFAULT_CONSENT_CONFIG,
  mergeConsentConfig,
} from './lib/consent.config';
export type { ConsentConfig } from './lib/consent.config';
export type {
  ConsentCategory,
  ConsentDecision,
  ConsentRecord,
} from './lib/consent.types';
export { runWhenConsented, ConsentIf } from './lib/consent-gate';
export { ConsentBanner } from './lib/banner/consent-banner.component';
export { ConsentPreferences } from './lib/preferences/consent-preferences.component';
export { LEGAL_ROUTES } from './lib/legal/legal.routes';
export { LegalLinks } from './lib/legal/legal-links.component';
