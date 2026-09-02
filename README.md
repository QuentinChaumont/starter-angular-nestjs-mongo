# Starter Nx — Angular + NestJS + Mongo

An Nx monorepo starter: an Angular frontend, a NestJS backend, and a set of
opt-in bricks you add only when a project needs them —

- **backend:** Mongo, JWT auth + refresh tokens + OIDC, HTTP security,
  healthchecks;
- **frontend:** Angular Material + theming, login/session, a dashboard
  shell, dialogs & toasts, cookie consent.

The base socle — typed config, structured logging with request IDs, uniform
HTTP errors, global validation, shared API contracts, OpenAPI — is always
there. Everything else is opt-in via local Nx generators.

## Creating a project from this starter

Clone (or use as a template), then:

```bash
npm install
npx nx run-many -t lint,test,build
```

Add whichever bricks the project needs (see below), then start the app:

```bash
npx nx serve @org/backend    # NestJS API, http://localhost:3000/api
npx nx serve frontend        # Angular app
```

## Architecture

```text
apps/
├── backend/        NestJS app — composition root only (app.module.ts, main.ts)
└── frontend/        Angular app

libs/
├── backend/
│   ├── core/         Always present: config, logger, HTTP errors, validation,
│   │                 OpenAPI, and the security/health bricks (see below)
│   ├── database/
│   │   └── mongo/    Optional: Mongoose connection + BaseRepository<T>
│   ├── auth/         Optional: JWT auth (Passport) + refresh tokens (rotation,
│   │                 httpOnly cookie, CSRF) + OIDC login + roles guard
│   ├── testing/       Optional: shared test helpers (buildTestConfig, ...)
│   └── features/      One lib per business feature (e.g. `user`)
│
├── frontend/
│   ├── core/          Always present: API base-URL token, consent hook
│   ├── design/        Optional: Angular Material + M3 theme + brand charter
│   ├── auth/          Optional: login + OIDC, session store, interceptors, guards
│   ├── dashboard/     Optional: responsive sidenav shell for /app/**
│   ├── feedback/      Optional: DialogService, NotificationService, ApiError toasts
│   └── consent/       Optional: cookie consent banner + /legal pages
│
└── shared/
    ├── contracts/     Types shared between Angular and NestJS (no Mongoose,
    │                  no Nest decorators, no Angular)
    └── utils/         Framework-agnostic utilities

tools/
└── starter-plugin/    Local Nx generators (see below)
```

Nx module boundaries (`eslint.config.mjs`) enforce: `scope:shared` code
can't depend on `scope:backend`/`scope:frontend`, and `scope:frontend`
can't depend on `scope:backend` (and vice versa). Run
`npx nx lint <project>` to check a project against them.

### Controller → Service → Repository

Every backend feature follows the same one-way chain:

```text
Controller → Service → Repository → Mongoose
```

Controllers never touch Mongoose models directly, and services never call
`@InjectModel(...)` themselves — only the repository layer does. This keeps
business logic testable without a database and keeps persistence details
out of the HTTP layer.

### `requestId`

Every HTTP request gets a `requestId`: reused from an incoming
`X-Request-Id` header if present, otherwise generated with
`crypto.randomUUID()`. It's available via `AsyncLocalStorage` from anywhere
in the request's call stack (controller, service, repository) without
threading it through function arguments, is included automatically in
every log line, and is echoed back in the `X-Request-Id` response header.

### Error format

Every error response — from the app's own domain errors, from framework
exceptions, or from anything unexpected — is normalized by
`GlobalExceptionFilter` to the same shape:

```json
{
  "statusCode": 404,
  "code": "USER_NOT_FOUND",
  "message": "User not found",
  "requestId": "...",
  "details": { "userId": "..." }
}
```

`details` is only ever present for specific application errors that
declare it, and only outside production. In production, unexpected errors
never leak a stack trace or a raw Mongoose error — the original is logged
server-side (with the `requestId`) and the client gets a generic `500`.

## Environment variables

Read and validated once at startup (`libs/backend/core/config`) — an
invalid value stops the app immediately with a readable error instead of
failing later at first use.

| Variable                       | Required                   | Default                      | Notes                                                                                                                        |
| ------------------------------ | -------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                     | no                         | `development`                | `development` \| `test` \| `production`                                                                                      |
| `PORT`                         | no                         | `3000`                       | Nx injects the root `.env` into every task; `apps/frontend/.env` pins the SPA dev-server to 4200 so it doesn't inherit this. |
| `CORS_ORIGINS`                 | no                         | `http://localhost:4200`      | Comma-separated list                                                                                                         |
| `RATE_LIMIT_TTL_SECONDS`       | no                         | `60`                         | Rate-limit window (security brick)                                                                                           |
| `RATE_LIMIT_LIMIT`             | no                         | `100`                        | Max requests per window (security brick)                                                                                     |
| `MONGO_URI`                    | only if Mongo is installed | —                            | `mongodb://...` or `mongodb+srv://...`                                                                                       |
| `JWT_SECRET`                   | only if auth is installed  | —                            | Access token signing key                                                                                                     |
| `JWT_EXPIRES_IN`               | no                         | `15m`                        | Access-token lifetime                                                                                                        |
| `REFRESH_EXPIRES_IN`           | no                         | `30d`                        | Refresh-token lifetime (auth brick)                                                                                          |
| `AUTH_COOKIE_SECURE`           | no                         | `true` in prod, else `false` | Allows http cookies in dev                                                                                                   |
| `AUTH_REGISTRATION_ENABLED`    | no                         | `true`                       | Self-service `POST /api/auth/register` + the `/register` page                                                                |
| `AUTH_RATE_LIMIT_LIMIT`        | no                         | `10`                         | Attempts per window for `/auth/login` + `/auth/register`                                                                     |
| `AUTH_RATE_LIMIT_TTL_SECONDS`  | no                         | `60`                         | That window, in seconds                                                                                                      |
| `SEED_ADMIN_EMAIL`             | only for `seed:admin`      | —                            | Bootstrap admin account                                                                                                      |
| `SEED_ADMIN_PASSWORD`          | only for `seed:admin`      | —                            |                                                                                                                              |
| `AUTH_REQUIRE_VERIFIED_EMAIL`  | no                         | `false`                      | `true` → `POST /auth/login` returns `403` until the email is verified (`auth-reset` brick)                                   |
| `RESET_TOKEN_TTL_MINUTES`      | no                         | `60`                         | Password-reset link lifetime                                                                                                 |
| `VERIFICATION_TOKEN_TTL_HOURS` | no                         | `24`                         | Email-verification link lifetime                                                                                             |
| `SMTP_URL`                     | no                         | —                            | Set to deliver mail over SMTP (needs `nodemailer`); otherwise console + `.eml` previews                                      |
| `MAIL_FROM`                    | no                         | `no-reply@localhost`         | `From` address for the mailer brick                                                                                          |
| `MAIL_PREVIEW_DIR`             | no                         | `tmp/mail`                   | Where the console transport writes `.eml` previews                                                                           |
| `OIDC_ISSUER`                  | only to enable OIDC        | —                            | Discovery URL                                                                                                                |
| `OIDC_CLIENT_ID`               | only to enable OIDC        | —                            |                                                                                                                              |
| `OIDC_REDIRECT_URI`            | only to enable OIDC        | —                            | `.../api/auth/oidc/callback`                                                                                                 |
| `OIDC_CLIENT_SECRET`           | no                         | —                            | Omit for a public client (PKCE only)                                                                                         |
| `OIDC_SCOPES`                  | no                         | `openid profile email`       |                                                                                                                              |
| `OIDC_FRONTEND_URL`            | no                         | `http://localhost:4200`      | Base of the post-login redirect                                                                                              |
| `OIDC_POST_LOGIN_REDIRECT`     | no                         | `/app`                       | Default relative landing path                                                                                                |
| `OIDC_REQUIRE_VERIFIED_EMAIL`  | no                         | `true`                       | Reject unverified provider emails                                                                                            |
| `OIDC_ROLES_CLAIM`             | no                         | —                            | Dot-path to a `string[]` claim → user roles                                                                                  |

Access config only through `AppConfigService` (e.g. `config.app.port`,
`config.mongo.uri`, `config.session.*`, `config.auth.*`, `config.mailer.*`,
`config.oidc.*`) —
never read `process.env` directly outside `libs/backend/core/config`.

## Naming conventions

- Files and folders: `kebab-case` (`user.service.ts`, `roles.guard.ts`).
- Nx project names: `backend-<segment>` / `frontend-<segment>` /
  `shared-<segment>` (e.g. `backend-features-user`), matching their path
  under `libs/`.
- npm package names: `@org/<same-as-project-name>`.
- Nx tags: `scope:{backend,frontend,shared}` and
  `type:{core,feature,data-access,util,app,tool}` — used by the module
  boundary lint rule above.

## Adding the optional bricks

Each generator is idempotent (safe to run again) and brings its own npm
dependencies along.

### Mongo

```bash
npx nx g @org/starter-plugin:mongo
```

Connects `libs/backend/database/mongo` (Mongoose connection,
`BaseRepository<T>`, and a `GET /health/ready` route) to the app.

### An entity

```bash
npx nx g @org/starter-plugin:entity product --crud
```

Generates `libs/backend/features/product` with a Mongo-backed schema,
repository, service, and (with `--crud`) a REST controller — requires
Mongo to already be installed. Add `--frontend` to also drop a shared
`libs/shared/contracts` type and a lazy frontend feature (see
[`frontend-feature`](#frontend-feature--lazy-business-modules) below).

### Auth

```bash
npx nx g @org/starter-plugin:auth
```

Connects `libs/backend/auth` to the app. Requires Mongo **and** a `user`
entity with `--crud` — `AuthModule` logs users in against it. Provides:

- `POST /auth/login` — email + password → short-lived **access token** in
  the JSON body, plus an `httpOnly` `refresh_token` cookie and a
  non-httpOnly `csrf-token` cookie.
- `POST /auth/register` — self-service sign-up (email, password, first/last
  name); creates the account with no roles and returns the same session as
  login. `GET /auth/registration` → `{ enabled }`. Turn both off with
  `AUTH_REGISTRATION_ENABLED=false` (then OIDC or an admin-created account
  is the only way in).
- `POST /auth/refresh` — rotates the refresh token (old one revoked;
  replaying it revokes the whole family) and returns a new access token.
  Guarded by a **double-submit CSRF** check (`csrf-token` cookie must match
  the `X-CSRF-Token` header). Same for `POST /auth/logout` (`204`).
- `login` + `register` also carry a **dedicated rate limit** (`AuthThrottlerGuard`,
  default 10 / 60s per IP → `429`), separate from the global throttler.
- `GET /auth/me`, plus the authz primitives (now in `@org/backend-core`):
  `JwtAuthGuard`, `RolesGuard` + `@Roles(...)`, `@CurrentUser()`. `AuthModule`
  binds a lenient JWT guard + `RolesGuard` **globally**, so any controller
  restricts a route to a role just by adding `@Roles('admin')` — that's how
  `POST/GET/PATCH/DELETE /users` become **admin-only** once auth is installed.
- **First admin**: `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` then
  `pnpm seed:admin` (idempotent — creates the account or promotes an
  existing one).
- **OIDC login** (inert until `OIDC_ISSUER`/`OIDC_CLIENT_ID`/
  `OIDC_REDIRECT_URI` are set): `GET /auth/oidc/{provider,login,callback}`.
  Authorization Code + PKCE via `openid-client`; the provider's tokens
  never leave the backend — the user is linked **by verified email** and
  gets our own access token + session cookies, then the browser is sent to
  `{OIDC_FRONTEND_URL}/auth/callback#access_token=…&redirect_to=…`.

See `libs/backend/auth/README.md` for the full contract.

### Security

```bash
npx nx g @org/starter-plugin:security
```

Wires Helmet, CORS, and rate limiting into the app (`main.ts` +
`app.module.ts`).

### Mailer

```bash
npx nx g @org/starter-plugin:mailer
```

Adds `MailerService` and a pluggable `MailTransport`. By default the
**console** transport logs each message and writes an `.eml` preview under
`MAIL_PREVIEW_DIR` — zero network, zero external dependency. Set `SMTP_URL`
(and `pnpm add nodemailer`) to deliver over SMTP instead. Ships typed
templates (`renderPasswordReset`, `renderEmailVerification`,
`renderWelcome`) and `InMemoryMailTransport` for tests. See
`libs/backend/mailer/README.md`.

### Password reset & email verification

```bash
npx nx g @org/starter-plugin:auth-reset
```

Needs the `auth` and `mailer` bricks. Adds `POST /api/auth/forgot-password`
(always `202`, no account enumeration), `POST /api/auth/reset-password`
(revokes every session on success), `POST /api/auth/verify-email` and
`POST /api/auth/resend-verification`. On registration the `auth` brick
emits a `user.registered` event this brick listens for to send the
verification email. Verification is **soft** by default
(`AUTH_REQUIRE_VERIFIED_EMAIL=false`) — a banner nudges the user. Wires the
`/forgot-password`, `/reset-password` and `/verify-email` frontend routes
plus the banner when `frontend-auth` is installed. See
`libs/backend/auth-reset/README.md`.

### Healthchecks

```bash
npx nx g @org/starter-plugin:health
```

Adds `GET /health/live` (always up — no external checks, so a Mongo outage
never fails it). `GET /health/ready` comes from the Mongo brick instead,
independently.

## Adding the frontend layer

The Angular app starts as a bare shell. Each frontend brick is opt-in via
a generator, in this order (each checks its prerequisites):

```bash
npx nx g @org/starter-plugin:frontend-design      # Material + M3 theme + charter
npx nx g @org/starter-plugin:frontend-auth        # login + OIDC, session, interceptors, guards
npx nx g @org/starter-plugin:frontend-dashboard   # responsive sidenav shell for /app/**
npx nx g @org/starter-plugin:frontend-feedback    # dialogs + toasts + ApiError bridge
npx nx g @org/starter-plugin:frontend-consent     # cookie banner + /legal pages
```

Each generator copies its lib, wires `apps/frontend/src/app/app.config.ts`
(and `app.routes.ts` / `app.ts` / `styles.scss` where needed), registers
the `@org/frontend-*` path, and is idempotent. Prerequisites:
`frontend-auth` → `frontend-design` + the backend `auth` brick;
`frontend-dashboard` → `frontend-auth`; `frontend-feedback` /
`frontend-consent` → `frontend-design`.

### `frontend-design` — theme & charter

`design.config.ts` (TypeScript) and `_tokens.scss` (CSS custom
properties, one per brand colour, written `light-dark(<light>, <dark>)`)
are the **build-time** charter; edit both together. `_theme.scss` sets up
Angular Material M3 and re-points its `--mat-sys-*` colour tokens at the
`--app-color-*` tokens. Light / dark is a single `color-scheme` on
`<html>`. `DESIGN.md` (repo root) documents the whole system.

Colours can also be changed **at runtime, per visitor**: `ThemeService`
and `<lib-theme-settings-panel>` write inline overrides on `<html>`,
persisted in `localStorage`, never touching the committed charter.

### `frontend-auth` — session & OIDC

- **Access token: memory only** (`AuthStore`), never `localStorage`.
- **Refresh token: httpOnly cookie** — invisible to JS. `authInterceptor`
  catches any `401` from a non-auth endpoint, runs **one** shared
  `POST /auth/refresh` (concurrent 401s queue on it), replays the request,
  and on failure clears the session and routes to `/login`.
- **Silent refresh at bootstrap** (`provideAuth()` app initializer) and in
  `authGuard` — an open session survives a reload.
- `csrfInterceptor` copies the `csrf-token` cookie into `X-CSRF-Token` on
  `/auth/refresh` and `/auth/logout`. All requests go out
  `withCredentials: true`.
- `LoginPage` shows the "Sign in with SSO" button only when
  `GET /auth/oidc/provider` reports it enabled, and the "Create an account"
  link only when `GET /auth/registration` reports it enabled; `RegisterPage`
  (`/register`) posts to `POST /auth/register` and lands straight into the
  session. `OidcCallback` (`/auth/callback`) consumes the token from the URL
  fragment, scrubs it, loads the profile and forwards.
- API base URL is `API_BASE_URL` (from `@org/frontend-core`, default
  `/api`). In local dev: `provideApiBaseUrl('http://localhost:3000/api')`.

The app owns `provideHttpClient(withInterceptors([...]))` so the auth and
feedback bricks each contribute an interceptor (auth before feedback).

**`--profile`** (`nx g @org/starter-plugin:frontend-auth --profile`, needs
the dashboard + feedback bricks) adds the **`/app/profile`** page — a lazy
feature that manages the connected account:

- `GET`/`PATCH /api/users/me` — edit first/last name **and email**.
  Changing the email clears its verified status, rejects a duplicate
  (`409`), and (with the `auth-reset` brick) re-sends a verification link
  to the new address; the "verify your email" banner reappears.
- `POST /api/auth/change-password` — a wrong current password is a `400`;
  a success revokes every **other** session and keeps this one.
- `DELETE /api/users/me` `{ password }` — **permanently** deletes the
  account after re-confirming the password (a confirm dialog gates it in
  the UI), then signs out and returns to `/login`.

Adds a "Profile" entry to the dashboard user-menu and points
`AuthStore.loadMe()` at `/users/me` (via the `ME_ENDPOINT` token) so the
full `UserProfile` is in the store.

### `frontend-feedback` — dialogs & error toasts

`DialogService.confirm()` / `.alert()` (a single built-in dialog, `false`
on cancel **or** Escape) and `NotificationService` (typed `MatSnackBar`).
`httpErrorInterceptor` turns an unhandled backend error into a toast —
`ApiError` message + a **Copy ID** action for the `requestId`; it ignores
`401` (auth flow handles it, so a successful silent refresh never flashes
a toast). Opt out per request with the `SKIP_ERROR_TOAST` `HttpContext`
token.

### `frontend-consent` — cookie consent

Non-blocking banner on the first visit (`<lib-consent-banner>` mounted in
`app.ts`, outside the router outlet). Nothing non-essential is granted
before a decision — the starter loads no analytics tag, it just exposes
`runWhenConsented('analytics', fn)` and `*consentIf="'marketing'"` as
hooks. The decision (categories + `policyVersion`) is stored in
`localStorage` and re-requested when it **expires** (`expiresInDays`,
~6 months) or when `policyVersion` bumps. Configure via
`provideConsent({ policyVersion, categories, ... })`.

`/legal/cookies` and `/legal/privacy` are **template** route components —
fill the `[PLACEHOLDERS]` before going live. "Manage cookies" appears in
the dashboard user-menu automatically (via a neutral `CONSENT_MANAGER`
hook — the dashboard doesn't depend on the consent brick).

### `frontend-feature` — lazy business modules

```bash
npx nx g @org/starter-plugin:frontend-feature reports --crud
npx nx g @org/starter-plugin:frontend-feature reports --roles admin --icon insights
```

Scaffolds `libs/frontend/features/<name>/` — a **lazy-loaded** feature
mounted at `/app/<name>`: a signal store, a typed HTTP service on
`${API_BASE_URL}/<name>`, a paginated list page and a detail page (`--crud`
adds an edit form + `new`/`:id/edit` routes). Wires a `loadChildren` child
route, a `DASHBOARD_NAV` entry and the `tsconfig` path — nothing static is
added to `app.config.ts` / `app.ts`, so it lands in its own bundle chunk.
Re-running is a no-op (it only re-applies the wiring, never touches the
generated files). Requires `frontend-design` + `frontend-dashboard`.

**Convention**: `libs/frontend/features/<x>` = lazy business feature;
`libs/frontend/<x>` = eager infra brick.

`nx g @org/starter-plugin:entity <name> --crud --frontend` runs this
generator right after the backend entity and drops a matching
`libs/shared/contracts` type both ends share.

### `frontend-admin-users` — user admin console

```bash
npx nx g @org/starter-plugin:frontend-admin-users
```

Turns the dashboard's placeholder `/app/admin` route into a real console
(needs the dashboard + feedback bricks) — lazy-loaded, still behind the
route's `roleGuard('admin')`:

- `GET /api/users?page=&pageSize=&search=` → **server-side** paginated
  `UserSummary` list, newest first, search on email/name.
- `PATCH /api/users/:id/roles` — grant/revoke roles; removing `admin` from
  the **last** admin is refused (`400 LAST_ADMIN`).
- `PATCH /api/users/:id/status` `{ active }` — a disabled account can no
  longer `login` or `refresh` (`403 ACCOUNT_DISABLED`, `disabledAt` set).
  No hard delete — disable instead.

Sensitive actions go through a `DialogService.confirm()`.

## Testing

`libs/backend/testing` (`@org/backend-testing`) exists to keep spec files
short: `buildTestConfig(overrides)`, `startTestMongo()`,
`listenOnRandomPort(app)`, `signTestJwt(config, user)`,
`nonExistentObjectId()`. See its README for details. (`backend-core`'s own
specs can't depend on it — that would be circular — and use an internal
equivalent at `libs/backend/core/src/testing/` instead.)

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every PR,
self-contained (no Nx Cloud token, so it stays green on a fork):

- `npm ci`, then `nx sync:check` + `nx format:check`;
- `nx affected -t lint test build typecheck` (base/head from
  `nrwl/nx-set-shas`) — a docs-only change runs almost nothing;
- the Nx computation cache is persisted with `actions/cache` on `.nx/cache`;
- a separate **`e2e`** job (PRs only) runs `nx affected -t e2e` — the
  Playwright suite lands in V2.1 step 38.

## Docker

```bash
npx nx g @org/starter-plugin:docker
docker compose up --build      # SPA on http://localhost:8080
```

Opt-in. Adds:

- **`apps/backend/Dockerfile`** — multi-stage: full install + `nx build` +
  `nx prune` in the builder, then `node:22-alpine` with **prod deps only**
  (`main.js` bundles the `@org/*` libs; the pruned `package.json` pulls
  just the runtime npm packages). `HEALTHCHECK` on `/api/health/live`,
  runs as `node`.
- **`apps/frontend/Dockerfile` + `nginx.conf`** — `nx build frontend` then
  `nginx:alpine`: SPA fallback to `index.html`, `/api` reverse-proxied to
  the `backend` service, hashed assets cached hard.
- **`docker-compose.yml`** — `mongo:7` (named volume + healthcheck),
  `backend` (waits for Mongo; config from the shell / an optional root
  `.env`), `frontend` on `:8080`. No secret is baked into an image;
  `JWT_SECRET` comes from the environment (a throwaway default lets
  `compose up` boot for a smoke test).
