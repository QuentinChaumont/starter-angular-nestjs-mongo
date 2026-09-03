import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { UserSummary } from '@org/shared-contracts';
import { AdminUsersService } from './admin-users.service';

export interface UserRolesData {
  user: UserSummary;
}

/**
 * Role multi-select for one user (V2.2 step 44). Loads the catalogue's
 * names itself (empty when the `role` brick isn't installed) so the caller
 * can open it straight from a click handler. Checkboxes for every catalogue
 * role plus any the user already has, and a free-text field to add a name.
 * Closes with the new `string[]` or `undefined` on cancel.
 */
@Component({
  selector: 'lib-user-roles-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Roles — {{ data.user.email }}</h2>
    <mat-dialog-content>
      <div class="user-roles">
        @for (role of options(); track role) {
          <mat-checkbox
            [checked]="selected().has(role)"
            (change)="toggle(role, $event.checked)"
          >
            {{ role }}
          </mat-checkbox>
        } @empty {
          <p class="user-roles__hint">No roles yet — add one below.</p>
        }

        <mat-form-field appearance="outline" class="user-roles__add">
          <mat-label>Add a role</mat-label>
          <input
            matInput
            [formControl]="newRole"
            autocomplete="off"
            (keydown.enter)="add()"
          />
        </mat-form-field>
        <button mat-stroked-button type="button" (click)="add()">Add</button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
  styles: `
    .user-roles {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-2, 8px);
      min-width: 320px;
    }
    .user-roles__hint {
      margin: 0;
      font-size: 0.8125rem;
      color: color-mix(in srgb, var(--app-color-on-surface) 60%, transparent);
    }
    .user-roles__add {
      width: 100%;
      margin-block-start: var(--app-space-2, 8px);
    }
  `,
})
export class UserRolesDialog {
  protected readonly data = inject<UserRolesData>(MAT_DIALOG_DATA);
  private readonly ref =
    inject<MatDialogRef<UserRolesDialog, string[]>>(MatDialogRef);
  private readonly service = inject(AdminUsersService);

  protected readonly newRole = new FormControl('', { nonNullable: true });

  private readonly catalogue = toSignal(this.service.roleNames(), {
    initialValue: [] as string[],
  });
  private readonly added = signal<string[]>([]);

  protected readonly selected = signal(new Set(this.data.user.roles));

  protected readonly options = computed(() => [
    ...new Set([
      ...this.catalogue(),
      ...this.data.user.roles,
      ...this.added(),
    ]),
  ]);

  protected toggle(role: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) next.add(role);
    else next.delete(role);
    this.selected.set(next);
  }

  protected add(): void {
    const name = this.newRole.value.trim().toLowerCase();
    if (!name) return;
    if (!this.options().includes(name)) {
      this.added.set([...this.added(), name]);
    }
    this.toggle(name, true);
    this.newRole.setValue('');
  }

  protected save(): void {
    this.ref.close([...this.selected()]);
  }

  protected cancel(): void {
    this.ref.close();
  }
}
