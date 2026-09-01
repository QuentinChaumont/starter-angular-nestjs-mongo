import {
  HttpContextToken,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { isApiError } from '@org/shared-contracts';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification/notification.service';

/**
 * Per-request opt-out:
 *
 *   http.post(url, body, { context: new HttpContext().set(SKIP_ERROR_TOAST, true) })
 *
 * for calls whose errors are handled inline (e.g. the login form).
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/**
 * Turns an unhandled backend error into a toast. `401` is left alone —
 * it's the auth flow's job (silent refresh / redirect to login), so a
 * refresh that succeeds never flashes a toast.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(SKIP_ERROR_TOAST) || error.status === 401) {
        return throwError(() => error);
      }

      const body: unknown = error.error;
      if (isApiError(body)) {
        notifications.error(
          body.message,
          body.requestId
            ? {
                action: 'Copy ID',
                onAction: () => copyToClipboard(body.requestId ?? ''),
              }
            : undefined,
        );
      } else if (error.status === 0) {
        notifications.error('Network error — check your connection and retry.');
      } else if (error.status >= 500) {
        notifications.error('Something went wrong. Please try again.');
      }

      return throwError(() => error);
    }),
  );
};

function copyToClipboard(text: string): void {
  try {
    void globalThis.navigator?.clipboard?.writeText(text);
  } catch {
    // clipboard unavailable — nothing else to do
  }
}
