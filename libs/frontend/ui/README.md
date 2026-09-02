# frontend-ui

Shared presentational primitives for the Angular app — no business logic,
no HTTP. Always available (not an opt-in brick).

## `<lib-data-table>`

Server-driven table. Per-column **contains** filter (case-insensitive) and
**sort** in the header, pagination below. It holds no data: the host gives
it `[columns]` and a `[dataSource]` that turns a `DataQuery`
(`{ page, pageSize, sort, dir, filters }`) into an `Observable<{ items, total }>`,
and the table re-queries on every change (filter typing is debounced).

```html
<lib-data-table [columns]="columns" [dataSource]="load">
  <ng-template libDataTableRowActions let-row>
    <button mat-button (click)="edit(row)">Edit</button>
  </ng-template>
</lib-data-table>
```

```ts
columns: DataColumn<Row>[] = [
  { key: 'email', label: 'Email', sortable: true, filterable: true,
    value: (r) => r.email },
  { key: 'name', label: 'Name', filterable: true,
    value: (r) => `${r.firstName} ${r.lastName}` },
];
load = (q: DataQuery) => this.api.list(q); // → { items, total }
```

A column may carry a `cell` `TemplateRef` for custom rendering
(`<ng-template let-row let-value="value">`); otherwise `value(row)` is shown
as text.

**This is the default for every table in the app** — reach for a bespoke
`<table>` only when the data genuinely isn't a paginated list.

## `<lib-password-reveal-button>`

A show/hide toggle for a password `<input>`. Drops in as a `matSuffix`; it
only flips the input's `type`, so it needs no form wiring:

```html
<input matInput #pw type="password" formControlName="password" />
<lib-password-reveal-button matSuffix [input]="pw" />
```

## Running unit tests

`nx test frontend-ui`.
