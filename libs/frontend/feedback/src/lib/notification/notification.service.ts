import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NOTIFICATION_CONFIG } from './notification.config';

export type NotificationKind = 'success' | 'info' | 'warn' | 'error';

export interface NotificationOptions {
  /** Override the auto-dismiss delay (ms). `0` keeps it until dismissed. */
  duration?: number;
  /** Optional action button label. */
  action?: string;
  /** Called when the action button is clicked. */
  onAction?: () => void;
}

/**
 * Thin, typed wrapper over `MatSnackBar`. One place to change how toasts
 * look and behave; components never touch `MatSnackBar` directly.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly config = inject(NOTIFICATION_CONFIG);

  success(message: string, options?: NotificationOptions): void {
    this.show('success', message, options);
  }

  info(message: string, options?: NotificationOptions): void {
    this.show('info', message, options);
  }

  warn(message: string, options?: NotificationOptions): void {
    this.show('warn', message, options);
  }

  error(message: string, options?: NotificationOptions): void {
    this.show('error', message, options);
  }

  private show(
    kind: NotificationKind,
    message: string,
    options?: NotificationOptions,
  ): void {
    const isError = kind === 'error';
    const label =
      options?.action ?? (isError ? 'Dismiss' : undefined);

    const ref = this.snackBar.open(message, label, {
      duration:
        options?.duration ??
        (isError ? this.config.errorDurationMs : this.config.durationMs),
      panelClass: `notification--${kind}`,
    });

    if (options?.onAction) {
      ref.onAction().subscribe(() => options.onAction?.());
    }
  }
}
