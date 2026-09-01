# frontend-dashboard

The default layout for the authenticated area: a top toolbar + a responsive
sidenav wrapping the routed content. Install with
`nx g @org/starter-plugin:frontend-dashboard` (needs `frontend-auth`).

## Exposes (`@org/frontend-dashboard`)

| Export | Use |
| --- | --- |
| `provideDashboard(nav)` | Spread into `app.config.ts` — provides `DASHBOARD_NAV`. |
| `DASHBOARD_NAV`, `NavItem` | The sidenav menu token + item type. |
| `DashboardShell` | Route component wrapping `/app/**` (`canActivate: [authGuard]`). |
| `DashboardHome` | Placeholder landing page — replace with the real one. |
| `SidenavNav`, `UserMenu` | Building blocks, if you build your own shell. |

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

## Enriching the profile

`AuthenticatedUserDto` is `{ id, roles }` — the token doesn't carry a name
or email. Add a profile endpoint and widen the DTO if the user menu should
show more.

## Running unit tests

`nx test frontend-dashboard`.
