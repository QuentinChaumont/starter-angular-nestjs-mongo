# frontend-ui

Shared presentational primitives for the Angular app — no business logic,
no HTTP. Always available (not an opt-in brick). Everything here is
standalone: `import { … } from '@org/frontend-ui'` and drop it in a
component's `imports`.

## Kit (V2.3 step 48)

Extracted from patterns that had been copy-pasted across the admin and
profile pages, then wired back into them.

| Export | What it is |
| --- | --- |
| `<lib-page-header>` | `[title]` / `[subtitle]` + a right-aligned `actions` slot (and an optional `breadcrumbs` slot). Replaces the per-page `.*__toolbar` headers. |
| `libAsyncButton` | Directive on a Material button: `[libAsyncButton]="saving()"` disables it and shows an inline spinner; `[busyDisabled]="form.invalid"` folds in the usual guard, so `[disabled]="form.invalid \|\| saving()"` + a separate `<mat-progress-bar>` collapse to one binding. |
| `<lib-form-errors>` | `[control]` + optional `[messages]` (per-validator overrides, e.g. translated). Renders the first active error, and only once the control is touched. English defaults for `required` / `email` / `minlength` / `maxlength` / `pattern`. |
| `<lib-relative-time>` | `[value]` (ISO / Date / ms) → "3 min ago" … falling back to an absolute date past a week, full date in `title`. One shared `setInterval` for the whole page, running only while a `<lib-relative-time>` is mounted (`RelativeTimeClock`). |
| `<lib-status-badge>` | `[tone]` (`neutral` \| `success` \| `warn` \| `danger`) + projected label. Replaces the `.*__tag` / `.*__status` pills. |
| `<lib-empty-state>` | `[icon]` + `[title]` + projected body + `action` slot. Used as `<lib-data-table>`'s `empty` slot and on any page whose data set can be empty. |
| `<lib-copy-button>` | `[value]` + `[label]`; copies to the clipboard and flips to a "Copied" tick for two seconds. On the 2FA backup codes. |

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

The empty state defaults to `<lib-empty-state>` with `emptyMessage`;
override it by projecting your own into the `empty` slot:

```html
<lib-data-table [columns]="columns" [dataSource]="load">
  <lib-empty-state empty icon="group_off" title="No users yet">
    <button mat-flat-button action (click)="invite()">Invite someone</button>
  </lib-empty-state>
</lib-data-table>
```

## `<lib-password-reveal-button>`

A show/hide toggle for a password `<input>`. Drops in as a `matSuffix`; it
only flips the input's `type`, so it needs no form wiring:

```html
<input matInput #pw type="password" formControlName="password" />
<lib-password-reveal-button matSuffix [input]="pw" />
```

## Running unit tests

`nx test frontend-ui`.
