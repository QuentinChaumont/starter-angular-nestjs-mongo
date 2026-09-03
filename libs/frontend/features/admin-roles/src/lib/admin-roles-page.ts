import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { isApiError } from '@org/shared-contracts';
import type { Role } from '@org/shared-contracts';
import type { Observable } from 'rxjs';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import {
  DataTable,
  DataTableRowActionsDirective,
  PageHeader,
  StatusBadge,
  type DataCellContext,
  type DataColumn,
  type DataQuery,
} from '@org/frontend-ui';
import { AdminRolesService } from './admin-roles.service';
import {
  RoleFormDialog,
  type RoleFormData,
  type RoleFormResult,
} from './role-form-dialog';

function apiMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : null;
  return isApiError(body) ? body.message : fallback;
}

@Component({
  selector: 'lib-admin-roles-page',
  imports: [
    MatButtonModule,
    DataTable,
    DataTableRowActionsDirective,
    PageHeader,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-roles">
      <lib-page-header
        title="Roles"
        subtitle="The catalogue the user console assigns from."
      >
        <button
          mat-flat-button
          color="primary"
          actions
          (click)="createRole()"
        >
          New role
        </button>
      </lib-page-header>

      <ng-template #nameCell let-role let-value="value">
        <span class="admin-roles__name">
          <span class="mono">{{ value }}</span>
          @if (role.system) {
            <lib-status-badge>system</lib-status-badge>
          }
        </span>
      </ng-template>

      <lib-data-table
        [columns]="columns()"
        [dataSource]="load"
        [pageSize]="20"
        emptyMessage="No roles match."
        errorMessage="Could not load roles."
      >
        <ng-template libDataTableRowActions let-role>
          <button mat-button [disabled]="role.system" (click)="editRole(role)">
            Edit
          </button>
          <button
            mat-button
            class="admin-roles__danger"
            [disabled]="role.system"
            (click)="deleteRole(role)"
          >
            Delete
          </button>
        </ng-template>
      </lib-data-table>
    </section>
  `,
  styles: `
    .admin-roles {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
      max-width: 1180px;
    }
    .admin-roles__name {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .admin-roles .mono {
      font-family: var(--app-font-mono);
      font-size: 0.75rem;
    }
    .admin-roles__danger:not([disabled]) {
      color: var(--app-color-error);
    }
    .admin-roles ::ng-deep .data-table__actions .mdc-button {
      --mdc-text-button-container-height: 28px;
      min-width: 0;
      padding-inline: 8px;
      font-size: 0.75rem;
      letter-spacing: 0;
    }
  `,
})
export class AdminRolesPage {
  private readonly service = inject(AdminRolesService);
  private readonly dialog = inject(DialogService, { optional: true });
  private readonly notify = inject(NotificationService, { optional: true });

  private readonly table = viewChild.required(DataTable);
  private readonly nameCell =
    viewChild.required<TemplateRef<DataCellContext<Role>>>('nameCell');

  protected readonly columns = computed<DataColumn<Role>[]>(() => [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      filterable: true,
      value: (r) => r.name,
      cell: this.nameCell(),
    },
    {
      key: 'description',
      label: 'Description',
      value: (r) => r.description ?? '—',
    },
  ]);

  protected readonly load = (query: DataQuery) => this.service.list(query);

  protected createRole(): void {
    this.openForm({ role: null }, (result) =>
      this.apply(
        this.service.create(result),
        'Role created.',
        'Could not create the role.',
      ),
    );
  }

  protected editRole(role: Role): void {
    this.openForm({ role }, (result) =>
      this.apply(
        this.service.update(role.id, result),
        'Role updated.',
        'Could not update the role.',
      ),
    );
  }

  protected deleteRole(role: Role): void {
    const run = () =>
      this.apply(
        this.service.remove(role.id),
        'Role deleted.',
        'Could not delete the role.',
      );
    if (!this.dialog) {
      run();
      return;
    }
    this.dialog
      .confirm({
        title: 'Delete role?',
        message: `"${role.name}" will be removed from the catalogue. Users that still have it must be updated first.`,
        confirmLabel: 'Delete role',
        danger: true,
      })
      .subscribe((ok) => {
        if (ok) run();
      });
  }

  private openForm(
    data: RoleFormData,
    onResult: (result: RoleFormResult) => void,
  ): void {
    if (!this.dialog) {
      return;
    }
    this.dialog
      .open<RoleFormDialog, RoleFormData, RoleFormResult>(RoleFormDialog, {
        data,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) onResult(result);
      });
  }

  private apply(
    request$: Observable<unknown>,
    okMessage: string,
    errorFallback: string,
  ): void {
    request$.subscribe({
      next: () => {
        this.notify?.success(okMessage);
        this.table().reload();
      },
      error: (err: unknown) =>
        this.notify?.error(apiMessage(err, errorFallback)),
    });
  }
}
