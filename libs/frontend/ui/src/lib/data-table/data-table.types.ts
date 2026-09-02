import { TemplateRef } from '@angular/core';
import { Observable } from 'rxjs';

export type SortDirection = 'asc' | 'desc';

/** Context passed to a column's custom `cell` template. */
export interface DataCellContext<T> {
  $implicit: T;
  value: string;
}

export interface DataColumn<T> {
  /** Stable key. Also the `sort` value sent in {@link DataQuery} and the
   * key under which this column's filter text appears in `filters`. */
  key: string;
  label: string;
  /** Plain-text accessor — the default cell content, and what a custom
   * `cell` receives as its `value`. */
  value?: (row: T) => string | number | null | undefined;
  /** Show a sort control in the header (sorting is server-side — the table
   * just emits the new {@link DataQuery}). */
  sortable?: boolean;
  /** Show a "contains" filter field in the header (case-insensitive,
   * server-side). */
  filterable?: boolean;
  align?: 'start' | 'end';
  /** Optional custom cell: `<ng-template let-row let-value="value">`. */
  cell?: TemplateRef<DataCellContext<T>>;
}

export interface DataQuery {
  /** 1-based. */
  page: number;
  pageSize: number;
  /** Column `key`, or `null` for the source's default order. */
  sort: string | null;
  dir: SortDirection;
  /** Only non-empty, trimmed entries. `{ email: 'ali' }`. */
  filters: Record<string, string>;
}

export interface DataPage<T> {
  items: T[];
  total: number;
}

/** What the host passes as `[dataSource]` — called on every page / sort /
 * filter change. */
export type DataSource<T> = (query: DataQuery) => Observable<DataPage<T>>;
