import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const REQUEST_ID_HEADER = 'X-Request-Id';
/** Auth endpoints must never trigger the refresh-on-401 dance. */
const IS_AUTH_ENDPOINT =
  /\/auth\/(login|register|registration|refresh|logout|me|oidc)(\/|\?|$)/;

function newRequestId(): string | null {
  try {
    return globalThis.crypto?.randomUUID() ?? null;
  } catch {
    return null;
  }
}

function withAuthHeaders<T>(
  req: HttpRequest<T>,
  token: string | null,
): HttpRequest<T> {
  let headers = req.headers;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has(REQUEST_ID_HEADER)) {
    const id = newRequestId();
    if (id) {
      headers = headers.set(REQUEST_ID_HEADER, id);
    }
  }
  return req.clone({ headers, withCredentials: true });
}

/**
 * - Adds `Authorization: Bearer <access token>` and an `X-Request-Id`.
 * - On a `401` from a non-auth endpoint: runs a single shared refresh
 *   (concurrent 401s queue on it), then replays the request once. If the
 *   refresh fails, clears the session and routes to `/login`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthEndpoint = IS_AUTH_ENDPOINT.test(req.url);
  const outgoing = withAuthHeaders(req, isAuthEndpoint ? null : store.token());

  return next(outgoing).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap(() => next(withAuthHeaders(req, store.token()))),
        catchError(() => {
          store.reset();
          void router.navigate(['/login']);
          return throwError(() => error);
        }),
      );
    }),
  );
};
