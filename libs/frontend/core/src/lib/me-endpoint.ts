import { InjectionToken } from '@angular/core';

/**
 * API path `AuthService.loadMe()` calls, relative to `API_BASE_URL`.
 * Defaults to `/auth/me` (just `id` + `roles` + `emailVerifiedAt`). The
 * profile brick (V2.1 step 34) overrides it with `/users/me`, which
 * returns the full `UserProfile`.
 */
export const ME_ENDPOINT = new InjectionToken<string>('ME_ENDPOINT', {
  providedIn: 'root',
  factory: () => '/auth/me',
});
