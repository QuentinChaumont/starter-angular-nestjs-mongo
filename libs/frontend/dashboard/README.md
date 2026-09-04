# frontend-dashboard

The default layout for the authenticated area: a top toolbar + a responsive
sidenav wrapping the routed content. Depends on `frontend-auth`; see
[`BRICKS.md`](../../../BRICKS.md) at the repo root to remove this brick.

## Exposes (`@org/frontend-dashboard`)

| Export                                           | Use                                                                                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provideDashboard(nav)`                          | Spread into `app.config.ts` — provides `DASHBOARD_NAV`.                                                                                               |
| `DASHBOARD_NAV`, `NavItem`                       | The sidenav menu token + item type (`children` for a collapsible group — see below).                                                                 |
| `filterNavByRole(items, roles)`                  | Pure — the recursive role filter `SidenavNav` runs; reuse it anywhere else the same tree needs the same rule (e.g. a breadcrumb trail).               |
| `DashboardShell`                                 | Route component wrapping `/app/**` (`canActivate: [authGuard]`). Shows a slim top progress bar during router navigations (150 ms anti-flicker delay). |
| `DashboardHome`                                  | Placeholder landing page — replace with the real one.                                                                                                 |
| `SidenavNav`, `NavTreeItem`, `UserMenu`          | Building blocks, if you build your own shell.                                                                                                         |
| `AdminTabsShell`                                 | `/app/admin` frame — a tab strip over a routed outlet (V2.3 step 49).                                                                                 |
| `ADMIN_TABS`, `provideAdminTab(tab)`, `AdminTab` | Multi-provider for the admin sub-tabs — each admin brick registers its own.                                                                           |

## What the generator wires

```ts
// app.routes.ts
{
  path: 'app',
  canActivate: [authGuard],
  loadComponent: () => import('@org/frontend-dashboard').then((m) => m.DashboardShell),
  children: [
    { path: '', loadComponent: () => import('...').then((m) => m.DashboardHome) },
    { path: 'admin', canActivate: [roleGuard('admin')], loadComponent: ... },
  ],
},
{ path: '', pathMatch: 'full', redirectTo: 'app' }
```

`/login` and `/auth/callback` stay **outside** the shell.

```ts
// app.config.ts
import { DASHBOARD_NAV } from './dashboard-nav';
providers: [..., provideDashboard(DASHBOARD_NAV)]
```

`apps/frontend/src/app/dashboard-nav.ts` holds the example menu — edit it.

## The shell

- `MatSidenav`: `side` + open on ≥ `md` (persisted in `localStorage`),
  `over` + closed below (`BreakpointObserver`, `(max-width: 959.98px)`).
  On mobile it closes after navigating.
- `SidenavNav` renders `DASHBOARD_NAV` through `filterNavByRole` + a tree of
  `NavTreeItem` rows — hiding entries whose `roles` the current user lacks,
  highlighting the active route, and rendering a `children` entry as a
  collapsible group (see below).
- `UserMenu` (toolbar): current roles, "Appearance" (opens
  `ThemeSettingsPanel` in a dialog), "Sign out" (→ `/login`).
- No business feature is imported — the shell only knows `DASHBOARD_NAV`.
- All colours come from `--app-color-*` tokens.
- A 2px `<mat-progress-bar>` pinned to the top edge shows while a router
  navigation is in flight — but only once it's run longer than 150 ms, so
  instant in-app moves don't flash it.

## Nested / collapsible groups

`NavItem.children` renders a sidenav entry as a collapsible group — a
Lens-style tree, nestable to any depth:

```ts
{
  label: 'Reports',
  icon: 'bar_chart',
  children: [
    { label: 'Sales', icon: 'point_of_sale', route: 'reports/sales' },
    { label: 'Usage', icon: 'query_stats', route: 'reports/usage' },
  ],
}
```

- A **group** (`children` set) renders as a header row that only
  toggles — its own `route`, if set, is ignored; give the group a landing
  page by putting it among its `children` instead. A **leaf** (`children`
  unset) is always a plain routed link.
- `filterNavByRole` walks the whole tree: a role-gated branch is dropped,
  and so is a group left with no visible children (its header can't
  navigate anywhere on its own).
- Expand state persists per item in `localStorage`
  (`app.dashboard.nav-expanded.<route-or-label>` — a group falls back to
  its `label` since it has no `route`, so keep those distinct), and the
  branch holding the active route auto-expands the first time it's seen; any
  later manual toggle (this session or a past one) wins over that from
  then on.
- Rendering is `NavTreeItem` (`libs/frontend/dashboard/src/lib/shell/nav-tree-item.ts`)
  — a small recursive component, one per row, indenting 16px per depth.

## Admin sub-tabs (V2.3 step 49)

The admin consoles group under a single `/app/admin` frame instead of one
sidenav entry each. `AdminTabsShell` is the `/app/admin` route component; it
renders a tab per `ADMIN_TABS` entry over a `<router-outlet>` (and just the
outlet when there's ≤ 1 tab). Each admin brick registers its own tab and
child route:

```ts
// app.config.ts — added by the frontend-admin-users / role / audit generators
provideAdminTab({
  label: 'Users',
  labelKey: 'dashboard.adminTabs.users',
  path: '',
  order: 0,
});
```

```ts
// app.routes.ts
{
  path: 'admin',
  canActivate: [roleGuard('admin')],   // covers every tab
  component: AdminTabsShell,
  children: [
    { path: '',      loadChildren: () => import('@org/frontend-features-admin-users')… },
    { path: 'roles', loadChildren: () => import('@org/frontend-features-admin-roles')… },
    { path: 'audit', loadChildren: () => import('@org/frontend-features-admin-audit')… },
  ],
}
```

## Enriching the profile

`AuthenticatedUserDto` is `{ id, roles }` — the token doesn't carry a name
or email. Add a profile endpoint and widen the DTO if the user menu should
show more.

## Running unit tests

`nx test frontend-dashboard`.
