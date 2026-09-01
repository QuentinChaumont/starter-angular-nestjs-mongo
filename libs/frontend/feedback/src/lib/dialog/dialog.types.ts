export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. */
  danger?: boolean;
}

export interface AlertOptions {
  title: string;
  message: string;
  dismissLabel?: string;
}

/** What `ConfirmDialog` receives as `MAT_DIALOG_DATA` (flat, not a union, so
 * the template never needs discriminant narrowing). */
export interface ConfirmDialogData {
  mode: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissLabel?: string;
  danger?: boolean;
}
