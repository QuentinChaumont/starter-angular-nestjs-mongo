import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import type { AuditEvent } from '@org/shared-contracts';
import {
  DataTable,
  PageHeader,
  RelativeTime,
  type DataCellContext,
  type DataColumn,
  type DataQuery,
} from '@org/frontend-ui';
import { AdminAuditService } from './admin-audit.service';

@Component({
  selector: 'lib-admin-audit-page',
  imports: [DataTable, PageHeader, RelativeTime],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="admin-audit">
      <lib-page-header
        title="Audit log"
        subtitle="Every sensitive auth and admin action, newest first."
      ></lib-page-header>

      <ng-template #whenCell let-row>
        <span class="mono"><lib-relative-time [value]="row.at" /></span>
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
