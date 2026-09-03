import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AuditEvent } from '@org/shared-contracts';
import {
  DataTable,
  type DataCellContext,
  type DataColumn,
  type DataQuery,
} from '@org/frontend-ui';
import { AdminAuditService } from './admin-audit.service';

@Component({
  selector: 'lib-admin-audit-page',
  imports: [DataTable, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-audit">
      <header class="admin-audit__toolbar">
        <div class="admin-audit__heading">
          <h1>Audit log</h1>
          <p>Every sensitive auth and admin action, newest first.</p>
        </div>
      </header>

      <ng-template #whenCell let-row>
        <span class="mono">{{ row.at | date: 'medium' }}</span>
      </ng-template>

      <ng-template #actorCell let-row>
        <span class="mono">{{ row.actorEmail ?? row.actorId ?? 'system' }}</span>
      </ng-template>

      <ng-template #actionCell let-row let-value="value">
        <span class="admin-audit__action">{{ value }}</span>
      </ng-template>

      <lib-data-table
        [columns]="columns()"
        [dataSource]="load"
        [pageSize]="25"
        emptyMessage="No audit events match."
        errorMessage="Could not load the audit log."
      />
    </section>
  `,
  styles: `
    .admin-audit {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
      max-width: 1180px;
    }
    .admin-audit__toolbar {
      padding-block-end: var(--app-space-3);
      border-block-end: var(--app-border-hairline);
    }
    .admin-audit__heading h1 {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .admin-audit__heading p {
      margin: 3px 0 0;
      font-size: 0.8125rem;
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
    }
    .admin-audit .mono {
      font-family: var(--app-font-mono);
      font-size: 0.75rem;
    }
    .admin-audit__action {
      font-family: var(--app-font-mono);
      font-size: 0.75rem;
      font-weight: 600;
    }
  `,
})
export class AdminAuditPage {
  private readonly service = inject(AdminAuditService);

  private readonly whenCell =
    viewChild.required<TemplateRef<DataCellContext<AuditEvent>>>('whenCell');
  private readonly actorCell =
    viewChild.required<TemplateRef<DataCellContext<AuditEvent>>>('actorCell');
  private readonly actionCell =
    viewChild.required<TemplateRef<DataCellContext<AuditEvent>>>('actionCell');

  protected readonly columns = computed<DataColumn<AuditEvent>[]>(() => [
    {
      key: 'at',
      label: 'When',
      sortable: true,
      value: (r) => r.at,
      cell: this.whenCell(),
    },
    {
      key: 'actor',
      label: 'Actor',
      filterable: true,
      value: (r) => r.actorEmail ?? r.actorId ?? 'system',
      cell: this.actorCell(),
    },
    {
      key: 'action',
      label: 'Action',
      filterable: true,
      value: (r) => r.action,
      cell: this.actionCell(),
    },
    { key: 'target', label: 'Target', value: (r) => r.target ?? '—' },
    { key: 'ip', label: 'IP', value: (r) => r.ip ?? '—' },
  ]);

  protected readonly load = (query: DataQuery) => this.service.list(query);
}
