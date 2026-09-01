import { Injectable, inject } from '@angular/core';
import { ComponentType } from '@angular/cdk/portal';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ConfirmDialog } from './confirm-dialog.component';
import { AlertOptions, ConfirmOptions } from './dialog.types';

const DEFAULTS: MatDialogConfig = {
  width: '420px',
  maxWidth: '90vw',
  autoFocus: 'dialog',
  restoreFocus: true,
};

/**
 * The app's dialog conventions in one place — not a re-export of
 * `MatDialog`. `confirm()` / `alert()` use a single built-in dialog;
 * `open()` is a typed passthrough that still applies the shared defaults.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(MatDialog);

  /** Resolves `true` if the user confirms, `false` on cancel / Escape. */
  confirm(options: ConfirmOptions): Observable<boolean> {
    return this.dialog
      .open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
        ...DEFAULTS,
        data: { ...options, mode: 'confirm' },
      })
      .afterClosed()
      .pipe(map((result) => result === true));
  }

  alert(options: AlertOptions): Observable<void> {
    return this.dialog
      .open<ConfirmDialog, unknown, boolean>(ConfirmDialog, {
        ...DEFAULTS,
        data: { ...options, mode: 'alert' },
      })
      .afterClosed()
      .pipe(map(() => undefined));
  }

  open<T, D = unknown, R = unknown>(
    component: ComponentType<T>,
    config?: MatDialogConfig<D>,
  ): MatDialogRef<T, R> {
    return this.dialog.open<T, D, R>(component, { ...DEFAULTS, ...config });
  }
}
