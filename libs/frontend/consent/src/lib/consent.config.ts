import { InjectionToken } from '@angular/core';
import { ConsentCategory } from './consent.types';

export interface ConsentConfig {
  /** Bump this whenever the cookie policy materially changes — a stored
   * decision made against an older version is re-requested. */
  policyVersion: string;
  /** A decision older than this is re-requested (~6 months). */
  expiresInDays: number;
  categories: ConsentCategory[];
  legal: {
    cookiePolicyRoute: string;
    privacyPolicyRoute: string;
  };
}

export const DEFAULT_CONSENT_CONFIG: ConsentConfig = {
  policyVersion: '2026-01-01',
  expiresInDays: 182,
  categories: [
    {
      id: 'essential',
      label: 'Strictly necessary',
      description:
        'Required for the site to work (session, security). Always on.',
      essential: true,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'Anonymous usage statistics to help us improve the product.',
    },
  ],
  legal: {
    cookiePolicyRoute: '/legal/cookies',
    privacyPolicyRoute: '/legal/privacy',
  },
};

export const CONSENT_CONFIG = new InjectionToken<ConsentConfig>(
  'CONSENT_CONFIG',
  { providedIn: 'root', factory: () => DEFAULT_CONSENT_CONFIG },
);

export function mergeConsentConfig(
  overrides: Partial<ConsentConfig>,
): ConsentConfig {
  return {
    ...DEFAULT_CONSENT_CONFIG,
    ...overrides,
    legal: { ...DEFAULT_CONSENT_CONFIG.legal, ...overrides.legal },
  };
}
