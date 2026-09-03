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
import type { UserSummary } from '@org/shared-contracts';
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
import type { Observable } from 'rxjs';
import { AdminUsersService } from './admin-users.service';
import { UserRolesDialog, type UserRolesData } from './user-roles-dialog';

function apiMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : null;
  return isApiError(body) ? body.message : fallback;
}

function sameRoles(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

@Component({
  selector: 'lib-admin-users-page',
  imports: [
    MatButtonModule,
    DataTable,
    DataTableRowActionsDirective,
    PageHeader,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-users">
      <lib-page-header
        title="Users"
        subtitle="Grant roles and enable or disable accounts."
      ></lib-page-header>

      <ng-template #emailCell let-user let-value="value">
        <span class="admin-users__email">
          <span class="mono">{{ value }}</span>
          @if (!user.emailVerifiedAt) {
            <lib-status-badge tone="warn">unverified</lib-status-badge>
          }
        </span>
      </ng-template>

      <lib-data-table
        [columns]="columns()"
        [dataSource]="load"
        [pageSize]="20"
        emptyMessage="No users match."
        errorMessage="Could not load users."
      >
        <ng-template libDataTableRowActions let-user>
          <button mat-button (click)="manageRoles(user)">Roles</button>
          <button mat-button (click)="revokeSessions(user)">Sessions</button>
          <button
            mat-button
            class="admin-users__danger"
            [class.admin-users__danger--off]="user.disabledAt"
            (click)="toggleStatus(user)"
          >
            {{ user.disabledAt ? 'Enable' : 'Disable' }}
          </button>
        </ng-template>
      </lib-data-table>
    </section>
  `,
  styles: `
    .admin-users {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
      max-width: 1180px;
    }
    .admin-users__email {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .admin-users .mono {
      font-family: var(--app-font-mono);
      font-size: 0.75rem;
    }
    .admin-users__danger:not(.admin-users__danger--off) {
      color: var(--app-color-error);
    }
    .admin-users ::ng-deep .data-table__actions .mdc-button {
      --mdc-text-button-container-height: 28px;
      min-width: 0;
      padding-inline: 8px;
      font-size: 0.75rem;
      letter-spacing: 0;
    }
  `,
})
export class AdminUsersPage {
  private readonly service = inject(AdminUsersService);
  private readonly dialog = inject(DialogService, { optional: true });
  private readonly notify = inject(NotificationService, { optional: true });

  private readonly table = viewChild.required(DataTable);
  private readonly emailCell =
    viewChild.required<TemplateRef<DataCellContext<UserSummary>>>('emailCell');

  protected readonly columns = computed<DataColumn<UserSummary>[]>(() => [
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      filterable: true,
      value: (u) => u.email,
      cell: this.emailCell(),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      filterable: true,
      value: (u) => `${u.firstName} ${u.lastName}`.trim(),
    },
    {
      key: 'roles',
      label: 'Roles',
      filterable: true,
      value: (u) => (u.roles.length ? u.roles.join(', ') : '—'),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      value: (u) => (u.disabledAt ? 'Disabled' : 'Active'),
    },
  ]);

  protected readonly load = (query: DataQuery) => this.service.list(query);

  /** Opens the role multi-select (V2.2 step 44); the dialog loads the
   * catalogue's names itself. */
  protected manageRoles(user: UserSummary): void {
    this.dialog
      ?.open<UserRolesDialog, UserRolesData, string[]>(UserRolesDialog, {
        data: { user },
      })
      .afterClosed()
      .subscribe((roles) => {
        if (roles && !sameRoles(roles, user.roles)) {
          this.apply(this.service.setRoles(user.id, roles));
        }
      });
  }

  protected revokeSessions(user: UserSummary): void {
    this.confirmThen(
      {
        title: 'Revoke sessions?',
        message: `${user.email} will be signed out of every device.`,
        danger: true,
      },
      () => this.apply(this.service.revokeSessions(user.id)),
    );
  }

  protected toggleStatus(user: UserSummary): void {
    const enable = Boolean(user.disabledAt);
    this.confirmThen(
      {
        title: enable ? 'Re-enable account?' : 'Disable account?',
        message: enable
          ? `${user.email} will be able to sign in again.`
          : `${user.email} will be signed out and blocked from signing in.`,
        danger: !enable,
      },
      () => this.apply(this.service.setStatus(user.id, enable)),
    );
  }

  private confirmThen(
    options: { title: string; message: string; danger?: boolean },
    action: () => void,
  ): void {
    if (!this.dialog) {
      action();
      return;
    }
    this.dialog.confirm(options).subscribe((ok) => {
      if (ok) action();
    });
  }

  private apply(request$: Observable<unknown>): void {
    request$.subscribe({
      next: () => {
        this.notify?.success('User updated.');
        this.table().reload();
      },
      error: (err: unknown) =>
        this.notify?.error(apiMessage(err, 'Could not update the user.')),
    });
  }
}
