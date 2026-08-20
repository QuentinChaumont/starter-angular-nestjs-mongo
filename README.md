# Starter Nx — Angular + NestJS + Mongo

An Nx monorepo starter: an Angular frontend, a NestJS backend, and a set of
optional backend bricks (Mongo, JWT auth, HTTP security, healthchecks) that
you add only when a project actually needs them.

The base socle — typed config, structured logging with request IDs, uniform
HTTP errors, global validation, shared API contracts, OpenAPI — is always
there. Everything else is opt-in via generators.

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
│   ├── auth/         Optional: JWT auth (Passport), roles guard
│   ├── testing/       Optional: shared test helpers (buildTestConfig, ...)
│   └── features/      One lib per business feature (e.g. `user`)
│
├── frontend/
│   └── core/
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

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `3000` | |
| `CORS_ORIGINS` | no | `http://localhost:4200` | Comma-separated list |
| `RATE_LIMIT_TTL_SECONDS` | no | `60` | Rate-limit window (security brick) |
| `RATE_LIMIT_LIMIT` | no | `100` | Max requests per window (security brick) |
| `MONGO_URI` | only if Mongo is installed | — | `mongodb://...` or `mongodb+srv://...` |
| `JWT_SECRET` | only if auth is installed | — | |
| `JWT_EXPIRES_IN` | no | `15m` | Only read once auth is installed |

Access config only through `AppConfigService` (e.g. `config.app.port`,
`config.mongo.uri`) — never read `process.env` directly outside
`libs/backend/core/config`.

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
Mongo to already be installed.

### Auth

```bash
npx nx g @org/starter-plugin:auth
```

Connects `libs/backend/auth` (JWT login, `JwtAuthGuard`, `RolesGuard`,
`@CurrentUser()`) to the app. Requires Mongo **and** a `user` entity with
`--crud` — `AuthModule` logs users in against it.

### Security

```bash
npx nx g @org/starter-plugin:security
```

Wires Helmet, CORS, and rate limiting into the app (`main.ts` +
`app.module.ts`).

### Healthchecks

```bash
npx nx g @org/starter-plugin:health
```

Adds `GET /health/live` (always up — no external checks, so a Mongo outage
never fails it). `GET /health/ready` comes from the Mongo brick instead,
independently.

## Testing

`libs/backend/testing` (`@org/backend-testing`) exists to keep spec files
short: `buildTestConfig(overrides)`, `startTestMongo()`,
`listenOnRandomPort(app)`, `signTestJwt(config, user)`,
`nonExistentObjectId()`. See its README for details. (`backend-core`'s own
specs can't depend on it — that would be circular — and use an internal
equivalent at `libs/backend/core/src/testing/` instead.)
