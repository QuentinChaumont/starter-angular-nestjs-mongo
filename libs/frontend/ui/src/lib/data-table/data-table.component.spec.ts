import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DataTable } from './data-table.component';
import { DataTableRowActionsDirective } from './data-table-row-actions.directive';
import { DataColumn, DataQuery } from './data-table.types';

interface Row {
  id: string;
  name: string;
}

@Component({
  imports: [DataTable, DataTableRowActionsDirective],
  template: `
    <lib-data-table
      [columns]="columns"
      [dataSource]="load"
      [filterDebounceMs]="0"
    >
      <ng-template libDataTableRowActions let-row>
        <button (click)="picked.set(row.id)">pick</button>
      </ng-template>
    </lib-data-table>
  `,
})
class Host {
  readonly queries: DataQuery[] = [];
  readonly picked = signal<string | null>(null);

  readonly columns: DataColumn<Row>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      filterable: true,
      value: (r) => r.name,
    },
  ];

  readonly load = (q: DataQuery) => {
    this.queries.push(q);
    const rows: Row[] = [
      { id: '1', name: 'Ada' },
      { id: '2', name: 'Bo' },
    ];
    const needle = q.filters['name']?.toLowerCase();
    const items = needle
      ? rows.filter((r) => r.name.toLowerCase().includes(needle))
      : rows;
    return of({ items, total: items.length });
  };
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((r) => setTimeout(r, 10));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function bodyRows(fixture: ComponentFixture<unknown>): NodeListOf<HTMLElement> {
  return fixture.nativeElement.querySelectorAll('tbody tr');
}

describe('DataTable', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    fixture = TestBed.configureTestingModule({
      imports: [Host],
    }).createComponent(Host);
    fixture.detectChanges();
    await settle(fixture);
  });

  it('renders rows from the data source and the projected actions', () => {
    const rows = bodyRows(fixture);
    expect(rows).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Ada');

    (rows[0].querySelector('button') as HTMLButtonElement).click();
    expect(fixture.componentInstance.picked()).toBe('1');
  });

  it('emits a new query with sort on header click', async () => {
    fixture.componentInstance.queries.length = 0;
    (
      fixture.nativeElement.querySelector(
        '.data-table__sort',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);

    expect(fixture.componentInstance.queries.at(-1)).toMatchObject({
      sort: 'name',
      dir: 'asc',
    });
  });

  it('re-runs the current query on reload()', async () => {
    const host = fixture.componentInstance;
    host.queries.length = 0;
    fixture.debugElement.children[0].componentInstance.reload();
    await settle(fixture);

    expect(host.queries).toHaveLength(1);
  });

  it('reveals a compact filter via the search icon and narrows the rows', async () => {
    fixture.componentInstance.queries.length = 0;

    // no filter field until the search icon is clicked
    expect(
      fixture.nativeElement.querySelector('.data-table__filter'),
    ).toBeNull();

    (
      fixture.nativeElement.querySelector(
        '.data-table__filter-toggle',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '.data-table__filter',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();

    input.value = 'ad';
    input.dispatchEvent(new Event('input'));
    await settle(fixture);

    expect(fixture.componentInstance.queries.at(-1)?.filters).toEqual({
      name: 'ad',
    });
    expect(bodyRows(fixture)).toHaveLength(1);
  });
});
