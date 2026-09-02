import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NgTemplateOutlet } from '@angular/common';
import { catchError, debounce, of, switchMap, tap, timer } from 'rxjs';
import { DataTableRowActionsDirective } from './data-table-row-actions.directive';
import {
  DataColumn,
  DataQuery,
  DataSource,
  SortDirection,
} from './data-table.types';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_FILTER_DEBOUNCE_MS = 250;

/**
 * Server-driven table. Each header carries a sort control and/or a search
 * icon that reveals a small "contains" filter (case-insensitive) beneath
 * it; pagination sits below. The table owns no data — the host supplies the
 * columns and a `[dataSource]` that turns a {@link DataQuery} into a page
 * of rows, and the table re-queries on every change.
 *
 * The trailing actions cell is projected:
 * `<ng-template libDataTableRowActions let-row>…</ng-template>`.
 */
@Component({
  selector: 'lib-data-table',
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="data-table" data-testid="data-table">
      @if (loading()) {
        <mat-progress-bar
          class="data-table__progress"
          mode="indeterminate"
        ></mat-progress-bar>
      }

      @if (error()) {
        <p class="data-table__error" role="alert">{{ errorMessage() }}</p>
      }

      <div class="data-table__scroll">
        <table class="data-table__table">
          <thead>
            <tr>
              @for (col of columns(); track col.key) {
                <th
                  [class.is-end]="col.align === 'end'"
                  [class.is-sorted]="sortKey() === col.key"
                  [attr.aria-sort]="ariaSort(col)"
                >
                  <div class="data-table__head">
                    @if (col.sortable) {
                      <button
                        type="button"
                        class="data-table__sort"
                        (click)="toggleSort(col)"
                      >
                        <span>{{ col.label }}</span>
                        <mat-icon>{{ sortIcon(col) }}</mat-icon>
                      </button>
                    } @else {
                      <span>{{ col.label }}</span>
                    }

                    @if (col.filterable) {
                      <button
                        type="button"
                        class="data-table__filter-toggle"
                        [class.is-active]="isFilterOpen(col)"
                        [attr.aria-label]="'Filter ' + col.label"
                        [attr.aria-pressed]="isFilterOpen(col)"
                        (click)="toggleFilter(col.key)"
                      >
                        <mat-icon>search</mat-icon>
                      </button>
                    }
                  </div>

                  @if (isFilterOpen(col)) {
                    <input
                      class="data-table__filter"
                      type="search"
                      [placeholder]="'Filter ' + col.label"
                      [attr.aria-label]="'Filter ' + col.label"
                      [value]="filterValue(col.key)"
                      (input)="setFilter(col.key, $any($event.target).value)"
                    />
                  }
                </th>
              }
              @if (rowActions) {
                <th class="data-table__actions-head"></th>
              }
            </tr>
          </thead>

          <tbody>
            @for (row of items(); track trackRow($index, row)) {
              <tr>
                @for (col of columns(); track col.key) {
                  <td [class.is-end]="col.align === 'end'">
                    @if (col.cell) {
                      <ng-container
                        [ngTemplateOutlet]="col.cell"
                        [ngTemplateOutletContext]="{
                          $implicit: row,
                          value: cellText(col, row),
                        }"
                      ></ng-container>
                    } @else {
                      {{ cellText(col, row) }}
                    }
                  </td>
                }
                @if (rowActions) {
                  <td class="data-table__actions">
                    <ng-container
                      [ngTemplateOutlet]="rowActions.template"
                      [ngTemplateOutletContext]="{ $implicit: row }"
                    ></ng-container>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (!loading() && !error() && items().length === 0) {
        <p class="data-table__empty">{{ emptyMessage() }}</p>
      }

      <mat-paginator
        [length]="total()"
        [pageIndex]="pageIndex()"
        [pageSize]="size()"
        [pageSizeOptions]="pageSizeOptions()"
        (page)="onPage($event)"
      ></mat-paginator>
    </div>
  `,
  styles: `
    .data-table {
      --dt-muted: color-mix(
        in srgb,
        var(--app-color-on-surface) 58%,
        transparent
      );
      --dt-divider: var(--app-color-outline);
      --dt-hover: color-mix(
        in srgb,
        var(--app-color-on-surface) 4%,
        transparent
      );

      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--app-color-surface);
      color: var(--app-color-on-surface);
      border: 1px solid var(--app-color-surface-variant);
      border-radius: var(--app-radius-md);
      overflow: hidden;
      font-family: var(--app-font-family);
    }
    .data-table__progress {
      position: absolute;
      inset-block-start: 0;
      inset-inline: 0;
      z-index: 1;
    }
    .data-table__scroll {
      overflow-x: auto;
    }
    .data-table__table {
      inline-size: 100%;
      border-collapse: collapse;
    }
    .data-table__table th {
      text-align: start;
      vertical-align: top;
      padding: 8px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      line-height: 1.3;
      color: var(--dt-muted);
      background: color-mix(
        in srgb,
        var(--app-color-surface-variant) 45%,
        var(--app-color-surface)
      );
      border-block-end: 1px solid var(--app-color-outline);
    }
    .data-table__table th.is-sorted {
      color: var(--app-color-primary);
    }
    .data-table__table th.is-end,
    .data-table__table td.is-end {
      text-align: end;
    }
    .data-table__table td {
      padding: 6px 12px;
      font-size: 0.8125rem;
      line-height: 1.4;
      font-variant-numeric: tabular-nums;
      border-block-end: 1px solid var(--dt-divider);
    }
    .data-table__table tbody tr:last-child td {
      border-block-end: 0;
    }
    .data-table__table tbody tr:hover {
      background: var(--dt-hover);
    }

    .data-table__head {
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      min-block-size: 20px;
    }
    .data-table__sort {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .data-table__sort mat-icon,
    .data-table__filter-toggle mat-icon {
      font-size: 16px;
      inline-size: 16px;
      block-size: 16px;
    }
    .data-table__sort mat-icon {
      opacity: 0.6;
    }
    .data-table__table th.is-sorted .data-table__sort mat-icon {
      opacity: 1;
    }
    .data-table__filter-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 22px;
      block-size: 22px;
      background: none;
      border: 0;
      padding: 0;
      border-radius: var(--app-radius-sm);
      color: var(--dt-muted);
      cursor: pointer;
    }
    .data-table__filter-toggle:hover {
      color: var(--app-color-on-surface);
    }
    .data-table__filter-toggle.is-active {
      color: var(--app-color-primary);
      background: color-mix(in srgb, var(--app-color-primary) 12%, transparent);
    }
    .data-table__filter {
      appearance: none;
      margin-block-start: 8px;
      inline-size: 100%;
      max-inline-size: 200px;
      padding: 5px 8px;
      font-family: inherit;
      font-size: 0.8125rem;
      font-weight: 400;
      color: var(--app-color-on-surface);
      background: var(--app-color-background);
      border: 1px solid var(--app-color-outline);
      border-radius: var(--app-radius-sm);
    }
    .data-table__filter::placeholder {
      color: var(--dt-muted);
    }
    .data-table__filter:focus {
      outline: none;
      border-color: var(--app-color-primary);
      box-shadow: 0 0 0 3px
        color-mix(in srgb, var(--app-color-primary) 22%, transparent);
    }

    .data-table__actions,
    .data-table__actions-head {
      text-align: end;
      white-space: nowrap;
    }
    .data-table__empty,
    .data-table__error {
      margin: 0;
      padding: 28px 16px;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--dt-muted);
    }
    .data-table__error {
      color: var(--app-color-error);
    }
    mat-paginator {
      --mat-paginator-container-size: 44px;
      --mat-paginator-container-text-size: 0.75rem;
      border-block-start: 1px solid var(--dt-divider);
      background: transparent;
    }

    @media (prefers-reduced-motion: reduce) {
      .data-table__filter {
        transition: none;
      }
    }
  `,
})
export class DataTable<T> {
  readonly columns = input.required<DataColumn<T>[]>();
  readonly dataSource = input.required<DataSource<T>>();
  readonly pageSize = input(DEFAULT_PAGE_SIZE);
  readonly pageSizeOptions = input(DEFAULT_PAGE_SIZE_OPTIONS);
  readonly filterDebounceMs = input(DEFAULT_FILTER_DEBOUNCE_MS);
  readonly emptyMessage = input('No rows match.');
  readonly errorMessage = input('Could not load the data.');

  @ContentChild(DataTableRowActionsDirective)
  protected rowActions?: DataTableRowActionsDirective<T>;

  protected readonly pageIndex = signal(0);
  protected readonly size = signal(DEFAULT_PAGE_SIZE);
  protected readonly sortKey = signal<string | null>(null);
  protected readonly sortDir = signal<SortDirection>('asc');
  /** Immediate (bound to the inputs). */
  protected readonly filterText = signal<Record<string, string>>({});
  /** Column keys whose filter field is expanded (search icon toggled). */
  protected readonly openFilters = signal<ReadonlySet<string>>(new Set());

  protected readonly items = signal<T[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);

  private readonly reloadTick = signal(0);

  /** Re-run the current query — call after a mutation changes a row. */
  reload(): void {
    this.reloadTick.update((n) => n + 1);
  }

  /** Debounced copy of {@link filterText} — the query only reacts to this. */
  private readonly filters = toSignal(
    toObservable(this.filterText).pipe(
      debounce(() => timer(this.filterDebounceMs())),
    ),
    { initialValue: {} as Record<string, string> },
  );

  private readonly query = computed<DataQuery>(() => {
    // `reloadTick` is a dep so `reload()` forces a fresh query object
    // (and therefore a re-fetch) even when nothing else changed.
    this.reloadTick();
    const filters: Record<string, string> = {};
    for (const [key, raw] of Object.entries(this.filters())) {
      const trimmed = raw.trim();
      if (trimmed) filters[key] = trimmed;
    }
    return {
      page: this.pageIndex() + 1,
      pageSize: this.size(),
      sort: this.sortKey(),
      dir: this.sortDir(),
      filters,
    };
  });

  private readonly result = toSignal(
    toObservable(this.query).pipe(
      tap(() => {
        this.loading.set(true);
        this.error.set(false);
      }),
      switchMap((q) =>
        this.dataSource()(q).pipe(
          catchError(() => {
            this.error.set(true);
            return of({ items: [] as T[], total: 0 });
          }),
        ),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: null },
  );

  constructor() {
    effect(() => this.size.set(this.pageSize()));
    effect(() => {
      const page = this.result();
      if (page) {
        this.items.set(page.items);
        this.total.set(page.total);
      }
    });
  }

  protected trackRow(index: number, row: T): unknown {
    return (row as { id?: unknown }).id ?? index;
  }

  protected cellText(col: DataColumn<T>, row: T): string {
    const raw = col.value?.(row);
    return raw === null || raw === undefined ? '' : String(raw);
  }

  protected filterValue(key: string): string {
    return this.filterText()[key] ?? '';
  }

  protected isFilterOpen(col: DataColumn<T>): boolean {
    return this.openFilters().has(col.key) || this.filterValue(col.key) !== '';
  }

  protected toggleFilter(key: string): void {
    const open = new Set(this.openFilters());
    if (open.has(key) || this.filterValue(key) !== '') {
      open.delete(key);
      this.openFilters.set(open);
      if (this.filterValue(key) !== '') this.setFilter(key, '');
    } else {
      open.add(key);
      this.openFilters.set(open);
    }
  }

  protected toggleSort(col: DataColumn<T>): void {
    if (this.sortKey() === col.key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(col.key);
      this.sortDir.set('asc');
    }
    this.pageIndex.set(0);
  }

  protected setFilter(key: string, value: string): void {
    this.filterText.update((current) => ({ ...current, [key]: value }));
    this.pageIndex.set(0);
  }

  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.size.set(event.pageSize);
  }

  protected sortIcon(col: DataColumn<T>): string {
    if (this.sortKey() !== col.key) return 'unfold_more';
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  protected ariaSort(col: DataColumn<T>): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== col.key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }
}
