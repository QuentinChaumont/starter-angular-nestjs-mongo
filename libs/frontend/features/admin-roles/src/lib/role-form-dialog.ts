import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Role } from '@org/shared-contracts';

export interface RoleFormData {
  /** The role being edited, or `null` to create a new one. */
  role: Role | null;
}

export interface RoleFormResult {
  name: string;
  description: string;
}

/**
 * Create / edit form for a role (V2.2 step 44). Opened via
 * `DialogService.open(RoleFormDialog, { data })`; closes with a
 * {@link RoleFormResult} or `undefined` on cancel. The `name` field is
 * read-only for a system role.
 */
@Component({
  selector: 'lib-role-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.role ? 'Edit role' : 'New role' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="role-form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input
            matInput
            formControlName="name"
            autocomplete="off"
            placeholder="editor"
          />
          <mat-hint>Lowercase letters, digits, "-" or "_".</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput formControlName="description" autocomplete="off" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="form.invalid"
        (click)="save()"
      >
        {{ data.role ? 'Save' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .role-form {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-2, 8px);
      min-width: 320px;
      padding-block-start: var(--app-space-2, 8px);
    }
    .role-form mat-form-field {
      width: 100%;
    }
  `,
})
export class RoleFormDialog {
  protected readonly data = inject<RoleFormData>(MAT_DIALOG_DATA);
  private readonly ref =
    inject<MatDialogRef<RoleFormDialog, RoleFormResult>>(MatDialogRef);

  protected readonly form = new FormGroup({
    name: new FormControl(
      { value: this.data.role?.name ?? '', disabled: !!this.data.role?.system },
      {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
        ],
      },
    ),
    description: new FormControl(this.data.role?.description ?? '', {
      nonNullable: true,
    }),
  });

  protected save(): void {
    if (this.form.invalid) {
      return;
    }
    const { name, description } = this.form.getRawValue();
    this.ref.close({ name: name.trim(), description: description.trim() });
  }

  protected cancel(): void {
    this.ref.close();
  }
}
