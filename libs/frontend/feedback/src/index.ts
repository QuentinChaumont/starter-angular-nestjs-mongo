export { provideFeedback } from './lib/provide-feedback';
export { DialogService } from './lib/dialog/dialog.service';
export type {
  AlertOptions,
  ConfirmOptions,
} from './lib/dialog/dialog.types';
export { NotificationService } from './lib/notification/notification.service';
export type {
  NotificationKind,
  NotificationOptions,
} from './lib/notification/notification.service';
export {
  NOTIFICATION_CONFIG,
  provideNotificationConfig,
} from './lib/notification/notification.config';
export type { NotificationConfig } from './lib/notification/notification.config';
export {
  SKIP_ERROR_TOAST,
  httpErrorInterceptor,
} from './lib/http-error.interceptor';
export { unsavedChangesGuard } from './lib/unsaved-changes.guard';
export type { HasUnsavedChanges } from './lib/unsaved-changes.guard';
export { GlobalErrorHandler } from './lib/global-error-handler';
