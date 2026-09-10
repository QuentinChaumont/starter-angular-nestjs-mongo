# backend-features-account-retention

Brick: **inactive-account retention** — stamps account activity, and runs
a daily sweep that warns then permanently deletes accounts that have been
inactive for longer than an admin-configured period. Depends on the
`auth`, `user` and `app-settings` bricks and the global `MailerService`.
Lives in its own lib because it pulls the optional mailer dependency; see
[`BRICKS.md`](../../../../BRICKS.md) at the repo root to remove it.

Ships **inert**: with no retention period configured (the default),
nothing is ever deleted and no email is sent.

## How it works

### Activity tracking

`RetentionActivityListener` subscribes to the `auth` brick's
`auth.login-succeeded` and `auth.session-refreshed` events and calls
`UserService.recordActivity(userId)`, which stamps `User.lastActiveAt`
(throttled to at most one write per 24 h) and clears any pending
`retentionWarnedAt`. The `auth` brick only emits — it never imports this
module — so the brick stays optional.

### The sweep — `AccountRetentionJob.run()`

Runs daily from `@Cron` (see [Config](#config)) and is also exposed for
ops as:

| Route                             | Auth            | Response                            |
| --------------------------------- | --------------- | ----------------------------------- |
| `POST /api/admin/account-retention/run` | `@Roles('admin')` | `{ warned: number; deleted: number }` |

The manual endpoint runs exactly the same logic as the cron — handy for
verifying configuration without waiting for 03:00.

**Reference date** for every comparison is `lastActiveAt ?? createdAt`, so
an account that has never logged in ages from its creation date.

1. Reads `app-settings`. If `accountRetention.inactiveDays` is `null`, the
   sweep is a no-op and returns `{ warned: 0, deleted: 0 }`.
2. **Warn phase** — only when `warningDays` is set and
   `warningDays < inactiveDays`. Selects up to `batchLimit` accounts whose
   reference date is at or before `now - (inactiveDays - warningDays)`
   days and that have no pending warning, emails each the
   `account-retention-warning` template (localised from `user.locale`,
   fallback `en`) and stamps `retentionWarnedAt = now`. A failed send is
   caught and logged and leaves `retentionWarnedAt` unset, so it retries
   next run.
3. **Delete phase** — selects up to `batchLimit` accounts whose reference
   date is at or before `now - inactiveDays` days and, when a warning
   window is configured, that were warned at least `warningDays` ago. Each
   is hard-deleted via `UserService.deleteById(id, { reason: 'retention' })`
   — the same deletion a user can trigger from their profile. A single
   failure is caught and logged; the loop continues.
4. Logs one summary line: `retention sweep: warned=N deleted=M`.

The "warned at least `warningDays` ago" guard is measured from when the
email actually went out, so lowering `inactiveDays` between runs never
deletes an account before it has had its full warning window.

### Never purged

Accounts with the `admin` role and accounts with `disabledAt` set are
excluded from **both** phases.

## Settings (`app-settings` brick)

Set at runtime by an admin via `PATCH /api/admin/settings` (admin console
→ Settings tab). Both default to `null`.

| Field                            | Meaning                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| `accountRetention.inactiveDays`  | Days of inactivity before permanent deletion. `null` ⇒ never delete. |
| `accountRetention.warningDays`   | Days before deletion to email a warning. `null` ⇒ no warning email. Must be `< inactiveDays`. |

## Config

Operational only — the *policy* lives in `app-settings` above.

| Variable                        | Default     | Notes                                                           |
| ------------------------------- | ----------- | -------------------------------------------------------------- |
| `ACCOUNT_RETENTION_CRON`        | `0 3 * * *` | Cron expression for the daily sweep. Any non-empty string; a bad expression makes `@nestjs/schedule` throw on boot. |
| `ACCOUNT_RETENTION_BATCH_LIMIT` | `1000`      | Max accounts warned and max deleted per run. Positive integer. |

`@Cron` needs its expression at decoration time and a decorator cannot
read DI, so `account-retention.job.ts` reads
`process.env['ACCOUNT_RETENTION_CRON'] ?? '0 3 * * *'` directly.
`batchLimit` is read through `AppConfigService.accountRetention.batchLimit`.
`validate-env` guarantees both values are sane (non-empty string /
positive integer) when set.

`@nestjs/schedule`'s `ScheduleModule.forRoot()` is registered once in
`apps/backend`.

## Running unit tests

Run `nx test backend-features-account-retention` to execute the unit tests
via [Jest](https://jestjs.io).
