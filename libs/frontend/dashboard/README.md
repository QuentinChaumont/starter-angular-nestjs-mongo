# frontend-dashboard

The default layout for the authenticated area: a top toolbar + a responsive
sidenav wrapping the routed content. Install with
`nx g @org/starter-plugin:frontend-dashboard` (needs `frontend-auth`).

## Exposes (`@org/frontend-dashboard`)

| Export | Use |
| --- | --- |
| `provideDashboard(nav)` | Spread into `app.config.ts` — provides `DASHBOARD_NAV`. |
| `DASHBOARD_NAV`, `NavItem` | The sidenav menu token + item type. |
| `DashboardShell` | Route component wrapping `/app/**` (`canActivate: [authGuard]`). Shows a slim top progress bar during router navigations (150 ms anti-flicker delay). |
| `DashboardHome` | Placeholder landing page — replace with the real one. |
| `SidenavNav`, `UserMenu` | Building blocks, if you build your own shell. |
| `AdminTabsShell` | `/app/admin` frame — a tab strip over a routed outlet (V2.3 step 49). |
| `ADMIN_TABS`, `provideAdminTab(tab)`, `AdminTab` | Multi-provider for the admin sub-tabs — each admin brick registers its own. |

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
- `SidenavNav` renders `DASHBOARD_NAV`, hiding entries whose `roles` the
  current user lacks, and highlights the active route.
- `UserMenu` (toolbar): current roles, "Appearance" (opens
  `ThemeSettingsPanel` in a dialog), "Sign out" (→ `/login`).
- No business feature is imported — the shell only knows `DASHBOARD_NAV`.
- All colours come from `--app-color-*` tokens.
- A 2px `<mat-progress-bar>` pinned to the top edge shows while a router
  navigation is in flight — but only once it's run longer than 150 ms, so
  instant in-app moves don't flash it.

## Admin sub-tabs (V2.3 step 49)

The admin consoles group under a single `/app/admin` frame instead of one
sidenav entry each. `AdminTabsShell` is the `/app/admin` route component; it
renders a tab per `ADMIN_TABS` entry over a `<router-outlet>` (and just the
outlet when there's ≤ 1 tab). Each admin brick registers its own tab and
child route:

```ts
// app.config.ts — added by the frontend-admin-users / role / audit generators
provideAdminTab({ label: 'Users', labelKey: 'dashboard.adminTabs.users', path: '', order: 0 })
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
