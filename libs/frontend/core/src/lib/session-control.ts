import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * A neutral hook so the consent UI can offer a "turn off the session
 * cookie" control **without** depending on the auth brick. The app wires
 * it to the auth session; `frontend-consent` injects it `{ optional: true }`
 * and hides the control when it's absent.
 */
export interface SessionControl {
  /** Whether a session cookie is currently in play (i.e. someone is
   * signed in on this device). */
  isActive(): boolean;
  /**
   * Confirm with the user, then clear the session cookie and sign them
   * out. Emits `true` if they went through with it, `false` if they
   * cancelled.
   */
  end(): Observable<boolean>;
}

export const SESSION_CONTROL = new InjectionToken<SessionControl>(
  'SESSION_CONTROL',
);
