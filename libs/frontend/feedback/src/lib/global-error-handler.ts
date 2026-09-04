import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { NotificationService } from './notification/notification.service';

/** Don't stack a toast on top of one still showing from an error loop. */
const RENOTIFY_AFTER_MS = 5_000;

/**
 * Last-resort handler for runtime errors Angular would otherwise only log:
 * a throw in an `effect`, a template expression, a lifecycle hook, an
 * unhandled promise. Keeps the console output, adds a non-blocking toast
 * with a Reload action so the user isn't left staring at a half-broken
 * screen.
 *
 * HTTP failures are left to `httpErrorInterceptor` (it knows the status
 * and the API error shape) — this only handles the rest.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notify = inject(NotificationService);
  private readonly document = inject(DOCUMENT);
  private lastNotifiedAt = 0;

  handleError(error: unknown): void {
    // Keep the default ErrorHandler's behaviour.
    console.error(error);

    if (error instanceof HttpErrorResponse) {
      return;
    }

    const now = Date.now();
    if (now - this.lastNotifiedAt < RENOTIFY_AFTER_MS) {
      return;
    }
    this.lastNotifiedAt = now;

    this.notify.error(
      'Something went wrong. Reload the page if it seems stuck.',
      {
        action: 'Reload',
        duration: 0,
        onAction: () => this.document.defaultView?.location.reload(),
      },
    );
  }
}
