import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { isApiError } from '@org/shared-contracts';
import type { UserSummary } from '@org/shared-contracts';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AdminUsersService } from './admin-users.service';

const PAGE_SIZE = 20;

function apiMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : null;
  return isApiError(body) ? body.message : fallback;
}

@Component({
  selector: 'lib-admin-users-page',
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-users">
      <h1>Users</h1>

      <mat-form-field appearance="outline" class="admin-users__search">
        <mat-label>Search by email or name</mat-label>
        <input matInput [formControl]="search" />
      </mat-form-field>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      @if (error(); as e) {
        <p role="alert">{{ e }}</p>
      }

      <table mat-table [dataSource]="items()">
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let u">
            {{ u.email }}
            @if (!u.emailVerifiedAt) {
              <span class="admin-users__tag">unverified</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let u">
            {{ u.firstName }} {{ u.lastName }}
          </td>
        </ng-container>
        <ng-container matColumnDef="roles">
          <th mat-header-cell *matHeaderCellDef>Roles</th>
          <td mat-cell *matCellDef="let u">{{ u.roles.join(', ') || '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let u">
            {{ u.disabledAt ? 'Disabled' : 'Active' }}
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u">
            <button mat-button (click)="toggleAdmin(u)">
              {{ isAdmin(u) ? 'Revoke admin' : 'Grant admin' }}
            </button>
            <button mat-button color="warn" (click)="toggleStatus(u)">
              {{ u.disabledAt ? 'Enable' : 'Disable' }}
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>

      @if (!loading() && items().length === 0) {
        <p class="admin-users__empty">No users match.</p>
      }

      <mat-paginator
        [length]="total()"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex()"
        [pageSizeOptions]="[10, 20, 50]"
        (page)="onPage($event)"
      ></mat-paginator>
    </section>
  `,
  styles: `
    .admin-users {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .admin-users table {
      width: 100%;
    }
    .admin-users__search {
      max-width: 360px;
    }
    .admin-users__tag {
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      background: var(--app-color-warn-container, #fff3cd);
      color: var(--app-color-on-warn-container, #664d03);
    }
  `,
})
export class AdminUsersPage implements OnInit {
  private readonly service = inject(AdminUsersService);
  private readonly dialog = inject(DialogService, { optional: true });
  private readonly notify = inject(NotificationService, { optional: true });

  protected readonly pageSize = PAGE_SIZE;
  protected readonly columns = ['email', 'name', 'roles', 'status', 'actions'];
  protected readonly search = new FormControl('', { nonNullable: true });

  protected readonly items = signal<UserSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly pageIndex = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.pageIndex.set(0);
        this.load();
      });
  }

  ngOnInit(): void {
    this.load();
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.load(event.pageSize);
  }

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
        this.load();
      },
      error: (err: unknown) =>
        this.notify?.error(apiMessage(err, 'Could not update the user.')),
    });
  }

  private load(pageSize = this.pageSize): void {
    this.loading.set(true);
    this.error.set(null);
    this.service
      .list({
        page: this.pageIndex() + 1,
        pageSize,
        search: this.search.value.trim() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.total.set(page.total);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load users.');
          this.loading.set(false);
        },
      });
  }
}
