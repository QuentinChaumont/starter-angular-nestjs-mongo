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
  type DataCellContext,
  type DataColumn,
  type DataQuery,
} from '@org/frontend-ui';
import { AdminUsersService } from './admin-users.service';

function apiMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : null;
  return isApiError(body) ? body.message : fallback;
}

@Component({
  selector: 'lib-admin-users-page',
  imports: [MatButtonModule, DataTable, DataTableRowActionsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-users">
      <header class="admin-users__toolbar">
        <div class="admin-users__heading">
          <h1>Users</h1>
          <p>Grant roles and enable or disable accounts.</p>
        </div>
      </header>

      <ng-template #emailCell let-user let-value="value">
        <span class="admin-users__email">
          <span class="mono">{{ value }}</span>
          @if (!user.emailVerifiedAt) {
            <span class="admin-users__tag">unverified</span>
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
          <button mat-button (click)="toggleAdmin(user)">
            {{ isAdmin(user) ? 'Revoke admin' : 'Grant admin' }}
          </button>
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
    .admin-users__toolbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--app-space-4);
      padding-block-end: var(--app-space-3);
      border-block-end: var(--app-border-hairline);
    }
    .admin-users__heading h1 {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .admin-users__heading p {
      margin: 3px 0 0;
      font-size: 0.8125rem;
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
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
    .admin-users__tag {
      padding: 1px 5px;
      border-radius: var(--app-radius-sm);
      border: var(--app-border-hairline);
      font: 500 0.6875rem/1.4 var(--app-font-mono);
      letter-spacing: 0.02em;
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
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

  protected isAdmin(user: UserSummary): boolean {
    return user.roles.includes('admin');
  }

  protected toggleAdmin(user: UserSummary): void {
    const grant = !this.isAdmin(user);
    const roles = grant
      ? [...user.roles, 'admin']
      : user.roles.filter((r) => r !== 'admin');
    this.confirmThen(
      {
        title: grant ? 'Grant admin?' : 'Revoke admin?',
        message: `${user.email} will ${grant ? 'gain' : 'lose'} the admin role.`,
        danger: !grant,
      },
      () => this.apply(this.service.setRoles(user.id, roles)),
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

  private apply(request$: ReturnType<AdminUsersService['setRoles']>): void {
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
