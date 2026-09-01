import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

/**
 * Lets an authenticated user through. Otherwise tries one silent refresh
 * (restores a session on a fresh reload); if that fails, redirects to
 * `/login?redirectTo=<attempted url>`.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (store.isAuthenticated()) {
    return true;
  }
  return auth.silentRefresh().pipe(
    map((restored) =>
      restored
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { redirectTo: state.url },
          }),
    ),
  );
};

/**
 * Requires at least one of `roles`. Runs `authGuard`'s restore logic first,
 * then checks the role. Wrong role → sends the user home (`/`); a project
 * can point this at its own `/forbidden` page instead.
 */
export function roleGuard(...roles: string[]): CanActivateFn {
  return (_route, state) => {
    const store = inject(AuthStore);
    const auth = inject(AuthService);
    const router = inject(Router);

    const decide = () => {
      const user = store.user();
      if (!user) {
        return router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url },
        });
      }
      return user.roles.some((role) => roles.includes(role))
        ? true
        : router.createUrlTree(['/']);
    };

    if (store.isAuthenticated()) {
      return decide();
    }
    return auth.silentRefresh().pipe(map(() => decide()));
  };
}
