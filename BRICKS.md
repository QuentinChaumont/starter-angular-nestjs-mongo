# Bricks

This app ships with **every brick already installed and wired**. The Nx
generators that used to install them (`@org/starter-plugin:mongo`,
`:auth`, `:frontend-design`, …) have been removed — they were one-shot
wiring scripts with nothing left to do once the app carries all the
bricks.

What the generators still do live for:

| Generator                                                                 | Purpose                                        |
| ------------------------------------------------------------------------- | ---------------------------------------------- |
| `@org/starter-plugin:entity <name> [--crud] [--frontend]`                 | Scaffold a new Mongo-backed backend feature    |
| `@org/starter-plugin:feature <name>`                                      | Scaffold a bare backend feature library        |
| `@org/starter-plugin:frontend-feature <name> [--crud] [--roles] [--icon]` | Scaffold a lazy `/app/<name>` business feature |

Everything below is **reference for removing a brick you don't need** — it
records what each one is, what it depends on, and every file the old
generator touched (so you know what to unwire). After any removal, run:

```bash
npx nx run-many -t typecheck lint test build
npx nx e2e frontend-e2e            # if you touched the frontend
```

The Nx module boundaries + `nx sync` + the type-aware lint will flag most
dangling references immediately.

---

## Dependency graph

Remove bricks leaf-first — never remove one that another installed brick
still depends on.

```text
backend-core ─┬─ security         (always on; setupSecurity in main.ts)
              ├─ health
              └─ mongo ─┬─ user (entity) ─┬─ auth ─┬─ auth-reset ── mailer
                        │                 │        ├─ audit
                        │                 │        └─ role
                        │                 └─ (users CRUD becomes admin-only)
                        └─ mailer (standalone; only auth-reset needs it)

frontend-design ─┬─ frontend-i18n ── frontend-auth ─┬─ frontend-dashboard ─┬─ frontend-admin-users ─┬─ admin-roles (role)
                 ├─ frontend-feedback                │                      │                        └─ admin-audit (audit)
                 └─ frontend-consent                 └─ profile (frontend-auth --profile)
```

Cross-cutting: `frontend-auth` also needs the backend `auth` brick;
`admin-roles` / `admin-audit` frontend features need their backend
counterpart (`role` / `audit`).

---

## Backend bricks

### `mongo`

- **Lib:** `libs/backend/database/mongo` (`@org/backend-database-mongo`) — Mongoose connection, `BaseRepository<T>`, `GET /health/ready`.
- **Also pulls:** `libs/backend/testing` (`@org/backend-testing`).
- **npm:** `@nestjs/mongoose`, `mongoose`, `@nestjs/terminus`; testing lib adds `mongodb-memory-server`.
- **Wiring:** `MongoModule` in `apps/backend/src/app/app.module.ts`.
- **Env:** `MONGO_URI` (required once installed).
- **Depended on by:** every backend feature (`user`, `auth`, `auth-reset`, `audit`, `role`). Removing Mongo means removing all of them.

### `security`

- **Lives inside** `libs/backend/core` — `src/lib/security/` (`setupSecurity()`, `AppSecurityModule`).
- **npm:** `helmet`, `@nestjs/throttler`.
- **Wiring:** `AppSecurityModule` in `app.module.ts`; in `apps/backend/src/main.ts` → `setupSecurity(app)` after `app.useLogger(logger)` and `app.useGlobalGuards(app.get(ThrottlerGuard))`; export line `./lib/security` in `libs/backend/core/src/index.ts`.
- **Env:** `RATE_LIMIT_TTL_SECONDS`, `RATE_LIMIT_LIMIT`, `TRUST_PROXY`.
- **Note:** Helmet / compression / CORS / `trust proxy` / `no-store` are always-on parts of `setupSecurity()`; only the throttler is truly optional. Removing this brick means dropping rate limiting and editing `setupSecurity()` down.

### `health`

- **Lives inside** `libs/backend/core` — `src/lib/health/` (`HealthModule`, `GET /health/live`).
- **npm:** `@nestjs/terminus`.
- **Wiring:** `HealthModule` in `app.module.ts`; export line `./lib/health` in `libs/backend/core/src/index.ts`.
- **Env:** none.
- **Note:** `/health/ready` is the Mongo brick's, not this one — independent.

### `mailer`

- **Lib:** `libs/backend/mailer` (`@org/backend-mailer`) — `MailerService`, pluggable `MailTransport` (console `.eml` previews by default, SMTP when `SMTP_URL` set).
- **npm:** none beyond `@org/backend-core` (SMTP needs `nodemailer` added by hand).
- **Wiring:** `MailerModule` in `app.module.ts`.
- **Env:** `SMTP_URL`, `MAIL_FROM`, `MAIL_PREVIEW_DIR`.
- **Depended on by:** `auth-reset`.

### `auth`

- **Requires:** `mongo` + a `user` entity with `--crud`.
- **Lib:** `libs/backend/auth` (`@org/backend-auth`) — JWT login, refresh-token rotation + reuse detection, double-submit CSRF, OIDC (generic / Google / Keycloak), connected identities, sessions/devices, TOTP 2FA. Authz primitives (`JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`) live in `backend-core` and are bound globally by `AuthModule`.
- **Also pulls:** `libs/backend/testing`.
- **npm:** `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `openid-client`, `qrcode`, `class-validator`.
- **Wiring:**
  - `AuthModule` in `app.module.ts`.
  - **seed-admin:** `apps/backend/src/seed-admin.ts`; `additionalEntryPoints` line in `apps/backend/webpack.config.js`; `seed-admin` target in `apps/backend/package.json` (`nx.targets`); `seed:admin` script in root `package.json`.
- **Env:** `JWT_SECRET` (required), `JWT_EXPIRES_IN`, `REFRESH_EXPIRES_IN`, `AUTH_COOKIE_SECURE`, `AUTH_REGISTRATION_ENABLED`, `AUTH_RATE_LIMIT_*`, `SEED_ADMIN_*`, `AUTH_REQUIRE_VERIFIED_EMAIL`, all `OIDC_*`.
- **Depended on by:** `auth-reset`, `audit`, `role`, `frontend-auth`. Removing auth makes `/users` CRUD public again.

### `auth-reset`

- **Requires:** `auth` + `mailer`.
- **Lib:** `libs/backend/auth-reset` (`@org/backend-auth-reset`) — `POST /api/auth/forgot-password` / `reset-password` / `verify-email` / `resend-verification`; hashed TTL'd `single_use_tokens` collection; listens for the `user.registered` event from `auth`.
- **Wiring (backend):** `AuthResetModule` in `app.module.ts`.
- **Wiring (frontend, only if `frontend-auth` present):**
  - `libs/frontend/auth/src/lib/reset/` (pages, service, `verify-email-banner`).
  - export lines `./lib/reset/reset.service`, `./lib/reset/reset.routes`, `./lib/reset/verify-email-banner` in `libs/frontend/auth/src/index.ts`.
  - `...RESET_ROUTES` in `apps/frontend/src/app/app.routes.ts`.
  - `<lib-verify-email-banner>` + its import in `apps/frontend/src/app/app.ts` / `app.html`.
  - "Forgot your password?" link in `libs/frontend/auth/src/lib/login/login-page.ts`.
- **Env:** `RESET_TOKEN_TTL_MINUTES`, `VERIFICATION_TOKEN_TTL_HOURS`, `AUTH_REQUIRE_VERIFIED_EMAIL`.

### `audit`

- **Requires:** `auth`.
- **Lib:** `libs/backend/features/audit` (`@org/backend-features-audit`) — append-only `audit_events`, best-effort writes from `auth`/`user` lifecycle events, read-only admin `GET /api/audit` + `/api/audit/actions`, request-scoped actor interceptor, TTL retention.
- **Wiring (backend):** `AuditModule` in `app.module.ts`; `@org/backend-features-audit` in `apps/backend/package.json` deps; `libs/backend/features/*` in root `package.json` `workspaces`.
- **Wiring (frontend, only if `frontend-admin-users` present):**
  - `libs/frontend/features/admin-audit` (`@org/frontend-features-admin-audit`).
  - path in `tsconfig.base.json`.
  - `{ path: 'audit', loadChildren: … ADMIN_AUDIT_ROUTES }` child of the `/app/admin` route in `app.routes.ts`.
  - `provideAdminTab({ … path: 'audit', order: 20 })` in `apps/frontend/src/app/app.config.ts`.
  - project references in `apps/frontend/tsconfig.spec.json` / `tsconfig.app.json`.
- **Env:** `AUDIT_RETENTION_DAYS`.

### `role`

- **Requires:** `auth` + `user`.
- **Lib:** `libs/backend/features/role` (`@org/backend-features-role`) — `Role` catalogue + admin-only CRUD `GET/POST/PATCH/DELETE /api/roles`; seeds the protected `admin` system role; validates role names at write time. `RolesGuard` itself is unchanged.
- **Wiring (backend):** `RoleModule` in `app.module.ts`; `@org/backend-features-role` in `apps/backend/package.json` deps; `libs/backend/features/*` in root `workspaces`.
- **Wiring (frontend, only if `frontend-admin-users` present):**
  - `libs/frontend/features/admin-roles` (`@org/frontend-features-admin-roles`).
  - path in `tsconfig.base.json`.
  - `{ path: 'roles', loadChildren: … ADMIN_ROLES_ROUTES }` child of `/app/admin` in `app.routes.ts`.
  - `provideAdminTab({ … path: 'roles', order: 10 })` in `app.config.ts`.
  - project references in `apps/frontend/tsconfig.spec.json` / `tsconfig.app.json`.
- **Env:** none.
- **Note:** without this brick the admin-users role dialog falls back to a free-text role list.

### `docker`

- **Files (verbatim, opt-in):** `apps/backend/Dockerfile`, `apps/frontend/Dockerfile`, `apps/frontend/nginx.conf`, `docker-compose.yml`, `.dockerignore`.
- **Wiring:** none — nothing imports these; delete the files to remove.

---

## Frontend bricks

All frontend libs are Angular projects (`project.json`, no `package.json`);
their npm deps sit in the root `package.json`. Each brick registers a
`@org/frontend-*` path in `tsconfig.base.json` and wires
`apps/frontend/src/app/app.config.ts` (and `app.routes.ts` / `app.ts` /
`app.html` / `styles.scss` where noted).

### `frontend-design`

- **Lib:** `libs/frontend/design` (`@org/frontend-design`) — Angular Material + CDK, M3 theme, `_tokens.scss` charter, `ThemeService` + runtime theme panel.
- **npm:** `@angular/animations`, `@angular/cdk`, `@angular/material` (pinned to the Angular version).
- **Wiring:** `...materialProviders` + `provideTheme()` in `app.config.ts`; `@use '…/design/src/lib/theme/theme';` at the top of `apps/frontend/src/styles.scss`; paths `@org/frontend-design` and `@org/frontend-design/theme-panel` in `tsconfig.base.json`; `DESIGN.md` at repo root (template).
- **Depended on by:** every other frontend brick.

### `frontend-i18n`

- **Requires:** `frontend-design`.
- **Lib:** `libs/frontend/i18n` (`@org/frontend-i18n`) — Transloco (`en`/`fr` bundled, no HTTP loader), `<lib-lang-switcher>`, `provideTranslocoTesting()`.
- **npm:** `@jsverse/transloco`.
- **Wiring:** `provideI18n()` in `app.config.ts`; paths `@org/frontend-i18n` + `@org/frontend-i18n/lang-switcher` in `tsconfig.base.json`; project reference `libs/frontend/i18n/tsconfig.lib.json` in `apps/frontend/tsconfig.spec.json`.
- **Depended on by:** `frontend-auth`. Other bricks ship an English fallback so they render without it.

### `frontend-auth`

- **Requires:** `frontend-design` + `frontend-i18n` + backend `auth`.
- **Lib:** `libs/frontend/auth` (`@org/frontend-auth`) — `AuthStore` (access token in memory), `authInterceptor` / `csrfInterceptor`, `authGuard` / `roleGuard`, `AUTH_ROUTES` (`/login`, `/register`, `/auth/callback`).
- **Also ensures:** `libs/frontend/core/src/lib/api-base-url.ts` + its export in `libs/frontend/core/src/index.ts`.
- **Wiring:** `provideHttpClient(withInterceptors([csrfInterceptor, authInterceptor, …]))` + `provideAuth()` in `app.config.ts`; `...AUTH_ROUTES` in `app.routes.ts`; path `@org/frontend-auth` in `tsconfig.base.json`.
- **`--profile`** (needs `frontend-dashboard` + `frontend-feedback`): `libs/frontend/features/profile` (`@org/frontend-features-profile`); `{ path: 'profile', loadChildren: … PROFILE_ROUTES }` child of `/app`; `{ provide: ME_ENDPOINT, useValue: '/users/me' }` in `app.config.ts`; "Profile" item in `libs/frontend/dashboard/src/lib/shell/user-menu.ts`; project references in `apps/frontend/tsconfig.{spec,app}.json`.
- **Depended on by:** `frontend-dashboard`.

### `frontend-dashboard`

- **Requires:** `frontend-auth`.
- **Lib:** `libs/frontend/dashboard` (`@org/frontend-dashboard`) — responsive `MatSidenav` shell, config-driven nav, `provideDashboard`, `provideAdminTab`, `ADMIN_TABS`. Routed components are lazy entry points (`/shell`, `/home`, `/admin-tabs`).
- **Wiring:** `provideDashboard(DASHBOARD_NAV)` in `app.config.ts`; `apps/frontend/src/app/dashboard-nav.ts` (template); the `{ path: 'app', canActivate: [authGuard], … children: [home, admin] }` route group + `{ path: '', redirectTo: 'app' }` in `app.routes.ts`; paths `@org/frontend-dashboard` + `/shell` + `/home` + `/admin-tabs` in `tsconfig.base.json`.
- **Depended on by:** `frontend-admin-users`, `frontend-auth --profile`.

### `frontend-feedback`

- **Requires:** `frontend-design`.
- **Lib:** `libs/frontend/feedback` (`@org/frontend-feedback`) — `DialogService`, `NotificationService`, `httpErrorInterceptor` (`ApiError` → toast, `SKIP_ERROR_TOAST` opt-out).
- **Wiring:** `httpErrorInterceptor` appended to `withInterceptors([…])` + `provideFeedback()` in `app.config.ts`; path `@org/frontend-feedback` in `tsconfig.base.json`.
- **Depended on by:** `frontend-admin-users`, `frontend-auth --profile`.

### `frontend-consent`

- **Requires:** `frontend-design`.
- **Lib:** `libs/frontend/consent` (`@org/frontend-consent`) — first-visit cookie banner, preferences dialog, `LEGAL_ROUTES` (`/legal/cookies` · `/privacy` · `/notice`, page templates), `<lib-legal-links>` footer, `runWhenConsented` / `*consentIf`.
- **Wiring:** `provideConsent()` in `app.config.ts`; `ConsentBanner` + `LegalLinks` imports + tags in `app.ts` / `app.html` (outside the router outlet); `{ path: 'legal', children: LEGAL_ROUTES }` in `app.routes.ts`; path `@org/frontend-consent` in `tsconfig.base.json`. "Manage cookies" shows in the dashboard menu via the neutral `CONSENT_MANAGER` hook (no dashboard→consent dependency).

### `frontend-admin-users`

- **Requires:** `frontend-dashboard` + `frontend-feedback`.
- **Lib:** `libs/frontend/features/admin-users` (`@org/frontend-features-admin-users`) — the `/app/admin` tabbed console; user list on `<lib-data-table>` (server-side paging, per-column filters), role + status dialogs.
- **Wiring:** swaps the `DashboardHome` placeholder on the `/app/admin` route for `AdminTabsShell` + a `{ path: '', loadChildren: … ADMIN_USERS_ROUTES }` child in `app.routes.ts`; `provideAdminTab({ … path: '', order: 0 })` in `app.config.ts`; `{ label: 'Admin', route: 'admin', roles: ['admin'] }` nav entry in `apps/frontend/src/app/dashboard-nav.ts`; path in `tsconfig.base.json`; project references in `apps/frontend/tsconfig.{spec,app}.json`.
- **Hosts the tabs** contributed by the `role` and `audit` bricks — remove those first.
