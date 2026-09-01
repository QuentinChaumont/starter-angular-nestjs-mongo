import { InjectionToken } from '@angular/core';

/**
 * A neutral hook so a shell (e.g. the dashboard user-menu) can offer a
 * "Manage cookies" entry **without** depending on the consent brick. The
 * `frontend-consent` brick provides it (`useExisting: ConsentService`);
 * consumers inject it `{ optional: true }` and skip the entry when absent.
 */
export interface ConsentManager {
  /** Re-open the consent preferences UI. */
  reopen(): void;
}

export const CONSENT_MANAGER = new InjectionToken<ConsentManager>(
  'CONSENT_MANAGER',
);
