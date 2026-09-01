import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Wires the auth brick's non-HTTP parts: a bootstrap-time silent refresh so
 * an open session survives a page reload (the access token is memory-only;
 * the refresh cookie is httpOnly).
 *
 *   providers: [
 *     provideHttpClient(withInterceptors([csrfInterceptor, authInterceptor])),
 *     provideAuth(),
 *   ]
 *
 * The app owns `provideHttpClient` so several bricks can each contribute an
 * interceptor (order matters — `authInterceptor` before `httpErrorInterceptor`).
 * `authInterceptor` / `csrfInterceptor` are exported for that.
 */
export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() =>
      firstValueFrom(
        inject(AuthService)
          .silentRefresh()
          .pipe(catchError(() => of(false))),
      ),
    ),
  ]);
}
