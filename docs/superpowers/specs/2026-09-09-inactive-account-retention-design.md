# Inactive-account retention — design

**Status:** approved (2026-09-09)
**Approach:** A — a generic `app-settings` brick plus a dedicated
`account-retention` brick.

## Goal

Let an administrator configure, at runtime, how long an inactive account
is kept before it is permanently deleted, with an optional warning email
sent a configurable number of days beforehand. The configured retention
period is surfaced in the public privacy notice. Both settings default to
"off" (accounts are never auto-deleted, no warning email), and in that
state the privacy notice shows a dedicated "we do not auto-delete" section.

## Non-goals

- No general-purpose admin settings UI beyond the one form this feature
  needs (the `app-settings` brick is generic; its UI is not).
- No soft-delete / anonymisation / restore flow — deletion is the same
  hard delete a user can already trigger from their profile.
- No per-user opt-out, no reminder cadence beyond the single warning
  email, no configurable cron from the UI.
- No e2e test unless explicitly requested later.

## Definitions

- **Inactive**: the account's reference date is older than the configured
  threshold. **Reference date** = `lastActiveAt ?? createdAt`.
- **Activity**: a successful login (any method) or a refresh-token
  rotation. Both stamp `lastActiveAt` (throttled) and clear
  `retentionWarnedAt`.
- **Excluded from auto-deletion**: any account with the `admin` role, and
  any account with `disabledAt` set. These are skipped in both the warn
  and the delete phase.

## Data model

### `User` schema (`libs/backend/features/user`)

Two new optional fields, owned by the `user` brick so the schema is valid
whether or not the `account-retention` brick is installed:

| field | type | notes |
|---|---|---|
| `lastActiveAt` | `Date?` | single-field index; stamped on activity, throttled (see below) |
| `retentionWarnedAt` | `Date?` | set when the warning email is sent; cleared on any activity |

Neither field is exposed on `UserProfile` / `UserSummary` contracts in
this iteration.

### `UserService.recordActivity(userId: string): Promise<void>`

- Loads the user (lightweight; `_id`, `lastActiveAt`, `retentionWarnedAt`).
- If `lastActiveAt` is set and newer than `now - 24h` **and**
  `retentionWarnedAt` is unset → no-op (throttle; avoids a write on every
  15-minute token refresh).
- Otherwise sets `lastActiveAt = now`, unsets `retentionWarnedAt`, saves.
- Never throws to the caller (wrap/log); activity stamping must not break
  a login.

### `AppSettings` document (`libs/backend/features/app-settings`)

A single Mongo document, `_id: 'app'`, collection `appsettings`. Absent
document ⇒ all defaults.

```ts
interface AppSettings {
  accountRetention: {
    /** Days of inactivity before deletion. null ⇒ never auto-delete. */
    inactiveDays: number | null;
    /** Days before deletion to email the user. null ⇒ no warning email. */
    warningDays: number | null;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  accountRetention: { inactiveDays: null, warningDays: null },
};
```

`AppSettingsService`:

- `get(): Promise<AppSettings>` — reads the doc, deep-merges over
  `DEFAULT_SETTINGS` (so new keys added in future always have a value).
- `update(patch: DeepPartial<AppSettings>): Promise<AppSettings>` —
  `findOneAndUpdate({_id:'app'}, {$set: <flattened patch>}, {upsert,new})`,
  merges, validates the result, emits `settings.updated`, returns it.
- Validation (`ValidationError`, thrown by `update`):
  - each of `inactiveDays` / `warningDays` is either `null` or an integer
    `>= 1`;
  - if both are set, `warningDays < inactiveDays`.

`AppSettingsEvents` (own `EventEmitter`, mirrors `AuthEvents` /
`UserEvents`): `emitUpdated({ changedBy?: string })` /
`onUpdated(listener)`.

## API

### `app-settings` brick

| method + path | auth | body / response |
|---|---|---|
| `GET /api/admin/settings` | `@Roles('admin')` | → `AppSettings` |
| `PATCH /api/admin/settings` | `@Roles('admin')` | body `UpdateSettingsDto` (partial `accountRetention`), → `AppSettings` |
| `GET /api/public/settings` | none (public, like `/health`) | → `{ accountRetention: { inactiveDays: number\|null, warningDays: number\|null } }` |

`UpdateSettingsDto` uses `class-validator`: `accountRetention` optional
nested object, `inactiveDays` / `warningDays` each
`@IsInt() @Min(1)` **or** `@ValidateIf` allowing explicit `null`. Cross-field
rule (`warningDays < inactiveDays`) enforced in `AppSettingsService.update`
against the merged result, not just the DTO, so a patch that sets only one
side is still checked.

The public endpoint is registered outside any `@Roles` guard. It exposes
only the whitelisted `accountRetention` block — never the whole document.

### `auth` brick

Add to `AuthEvents`:

```ts
interface SessionRefreshedEvent { userId: string }
emitSessionRefreshed(payload: SessionRefreshedEvent): void   // 'auth.session-refreshed'
onSessionRefreshed(listener: (e: SessionRefreshedEvent) => void): void
```

`AuthService.refresh` emits it after a successful `refreshTokens.rotate`,
with the resolved `userId`. `login` already emits `auth.login-succeeded`.

### `user` brick

Add a `user.deleted` lifecycle event to `UserEvents`
(`emitDeleted({ userId, email, reason: 'self' | 'retention' })`) if one
does not already exist, so the audit brick can log a retention purge
distinctly from a self-service deletion. `UserService.deleteById` /
`deleteAccount` emit it (`reason` passed by the caller, default `'self'`).

## `account-retention` brick (`libs/backend/features/account-retention`)

Own lib (per the repo rule: a brick that needs an optional dep — here the
mailer — lives in its own lib). Imports `AppSettingsModule`, `UserModule`,
`AuthModule` (for `AuthEvents`); uses the global `MailerService`. Adds
`@nestjs/schedule` as a dependency and `ScheduleModule.forRoot()` to
`apps/backend` `AppModule`.

### `RetentionActivityListener` (`OnModuleInit`)

Mirrors `AuditListeners`. On init:

- `authEvents.onLoginSucceeded(e => userService.recordActivity(e.userId))`
- `authEvents.onSessionRefreshed(e => userService.recordActivity(e.userId))`

### `AccountRetentionJob`

`@Cron(process.env.ACCOUNT_RETENTION_CRON ?? '0 3 * * *')` →
`run()` (also callable directly from tests and, optionally, an
admin-only `POST /api/admin/settings/account-retention/run` for manual
trigger — include it, it is cheap and useful for ops).

`run()`:

1. `s = await settings.get()`. If `s.accountRetention.inactiveDays == null`
   → return `{ warned: 0, deleted: 0, skipped: 'disabled' }`.
2. `now = new Date()`; `inactiveDays`, `warningDays` from settings.
   `batchLimit = Number(process.env.ACCOUNT_RETENTION_BATCH_LIMIT ?? 1000)`.
3. Base filter (Mongo): `roles: { $ne: 'admin' }`, `disabledAt: { $in: [null, undefined] }`.
   Reference-date comparison is expressed as
   `$expr` on `{ $ifNull: ['$lastActiveAt', '$createdAt'] }`, or done in
   two queries (`lastActiveAt` set vs. unset) — implementer's choice, must
   be covered by tests either way.
4. **Warn phase** (only if `warningDays != null` and
   `warningDays < inactiveDays`):
   - `warnBefore = now - (inactiveDays - warningDays) days`
   - select up to `batchLimit`: reference date `<= warnBefore`,
     `retentionWarnedAt == null`.
   - for each: compute `deletionDate = referenceDate + inactiveDays days`,
     send `account-retention-warning` email, set `retentionWarnedAt = now`.
     Email send is fire-and-forget with a caught/logged failure — a failed
     send leaves `retentionWarnedAt` unset so it retries next run.
5. **Delete phase**:
   - `deleteBefore = now - inactiveDays days`
   - select up to `batchLimit`: reference date `<= deleteBefore` **and**
     (`warningDays == null` **or**
     (`retentionWarnedAt != null` **and**
     `retentionWarnedAt <= now - warningDays days`)).
   - for each: `await userService.deleteById(id, { reason: 'retention' })`.
6. Return counts; log a single summary line
   (`retention sweep: warned=N deleted=M`).

The delete-phase guard on `retentionWarnedAt <= now - warningDays` means a
user is never deleted until a full `warningDays` has elapsed **since the
email actually went out**, even if an admin lowers `inactiveDays` between
runs.

### Warning email template

`account-retention-warning` added to the mailer templates (`render.ts`
registry + subject/body). Localised from `user.locale` (fallback `en`).
Content: greeting by first name, "your account has been inactive since
<date> and will be permanently deleted on <deletionDate>", "to keep it,
just sign in", link to the app / profile. Plain, matches existing
templates' tone.

## Frontend

### `libs/frontend/features/admin-settings`

New lazy feature lib, wired as a 4th tab under `/admin` via the existing
`admin-tabs.tokens` mechanism (route `admin/settings`, `roleGuard('admin')`
already applied by the parent).

- `AdminSettingsService` — `GET` / `PATCH /api/admin/settings`.
- `AdminSettingsPage` — reactive form, zoneless, OnPush, Material via
  `@org/frontend-ui` / `@org/frontend-feedback` (never direct
  `@angular/material` — lint rule):
  - "Delete inactive accounts after `[ number ]` days" — empty ⇒ `null`.
  - "Warn the user `[ number ]` days before deletion" — empty ⇒ `null`,
    disabled/ignored when the first field is empty.
  - client validation: both integers `>= 1`, warning `<` retention;
    server `ValidationError` surfaced on the form.
  - success → snackbar via `@org/frontend-feedback`.
  - a hint line: "Leave blank to keep inactive accounts forever."

### `PublicSettingsService` (`libs/frontend/core`)

- `GET /api/public/settings`, no auth, no interceptor requirements.
- Exposes a typed `accountRetention` and a small `resolvePublicSettings`
  helper / signal for pages to consume.

### `privacy-policy.page.ts` (`libs/frontend/consent`)

On load, resolve public settings and render one of two variants in a new
**"Account retention"** `<h2>` section:

- `inactiveDays != null`:
  > Inactive accounts are permanently deleted after **N days** of
  > inactivity. *(if `warningDays != null`)* We email you **M days**
  > before deletion so you can keep the account by signing in.
- `inactiveDays == null`:
  > We keep your account for as long as it exists. We do **not**
  > automatically delete inactive accounts. You can delete your account at
  > any time from your profile.

The same value replaces the `[N months]` placeholder in the existing
"Retention" list item for account data. If the settings request fails, the
page falls back to the `inactiveDays == null` wording (safe default) and
does not block rendering.

## Error handling

- Activity stamping: swallow + log; never breaks login/refresh.
- Email send failure: caught, logged, `retentionWarnedAt` left unset for
  retry next run.
- A single user's `deleteById` failure in the sweep: caught + logged,
  loop continues; that user is retried next run.
- `AppSettingsService.update` validation failure → `400` `ValidationError`
  with a machine code (`INVALID_SETTINGS`), form-friendly.
- Public settings endpoint must never 500 on a missing document — returns
  defaults.

## Testing

Backend (Jest):

- `AppSettingsService`: default merge when doc absent; deep-merge of a
  partial patch; each validation rule (null allowed, `< 1` rejected,
  `warningDays >= inactiveDays` rejected); `settings.updated` emitted.
- `AppSettingsController`: admin guard on `GET`/`PATCH`; `GET
  /public/settings` reachable unauthenticated and whitelist-only.
- `UserService.recordActivity`: stamps when stale / unset; throttled
  no-op when fresh; clears `retentionWarnedAt`; never throws.
- `AccountRetentionJob.run` with fake timers:
  - `inactiveDays == null` ⇒ no-op.
  - warn phase selects only accounts in the window, skips `admin` /
    `disabledAt`, sets `retentionWarnedAt`, sends one email each.
  - delete phase respects the `retentionWarnedAt <= now - warningDays`
    guard (lowering `inactiveDays` mid-cycle does not delete early).
  - `warningDays == null` ⇒ delete phase runs with no email.
  - `batchLimit` caps each phase.
  - reference-date fallback to `createdAt` when `lastActiveAt` unset.
- `RetentionActivityListener`: both events call `recordActivity`.
- Warning email template: renders subject + body in `en` and `fr`,
  includes the deletion date.
- `AuthService.refresh` emits `auth.session-refreshed`.

Frontend (Jest, zoneless):

- `AdminSettingsPage`: loads current values; blank ⇒ `null` in the PATCH
  payload; client validation (warning `<` retention); server error shown.
- `privacy-policy.page`: both rendering branches; fallback to the
  "not auto-deleted" wording when the request fails.

## Rollout / config

- New env vars, all optional, documented in `.env.example` and the
  `account-retention` brick README:
  - `ACCOUNT_RETENTION_CRON` (default `0 3 * * *`)
  - `ACCOUNT_RETENTION_BATCH_LIMIT` (default `1000`)
- `@nestjs/schedule` added to root `package.json` +
  `libs/backend/features/account-retention/package.json` (generator reads
  a lib's own `dependencies`). Lock regenerated per the multi-pass npm
  procedure; verified with a real `npm ci`.
- `nx sync` after wiring the new libs into `apps/backend` /
  `apps/frontend`.
- Ship with both settings `null` ⇒ zero behavioural change until an admin
  opts in.
