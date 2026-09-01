import { InjectionToken, Provider } from '@angular/core';

export interface NotificationConfig {
  /** Auto-dismiss for success / info / warn toasts. */
  durationMs: number;
  /** Errors linger longer and get a Dismiss action. */
  errorDurationMs: number;
}

export const NOTIFICATION_CONFIG = new InjectionToken<NotificationConfig>(
  'NOTIFICATION_CONFIG',
  {
    providedIn: 'root',
    factory: () => ({ durationMs: 4000, errorDurationMs: 10000 }),
  },
);

export function provideNotificationConfig(
  config: Partial<NotificationConfig>,
): Provider {
  return {
    provide: NOTIFICATION_CONFIG,
    useValue: { durationMs: 4000, errorDurationMs: 10000, ...config },
  };
}
