import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ConfirmDialogData } from './dialog.types';

/**
 * The one dialog behind `DialogService.confirm()` / `.alert()`. Not exported
 * for direct use — go through the service so conventions stay consistent.
 */
@Component({
  selector: 'lib-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.mode === 'confirm') {
        <button mat-button (click)="close(false)">
          {{ data.cancelLabel ?? 'Cancel' }}
        </button>
        <button
          mat-flat-button
          [color]="data.danger ? 'warn' : 'primary'"
          (click)="close(true)"
        >
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      } @else {
        <button mat-flat-button color="primary" (click)="close(true)">
          {{ data.dismissLabel ?? 'OK' }}
        </button>
      }
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef);

  protected close(result: boolean): void {
    this.ref.close(result);
  }
}
