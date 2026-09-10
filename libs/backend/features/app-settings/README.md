# backend-features-app-settings

Brick: **runtime-configurable application settings**. A generic key-value
store for settings an admin changes at runtime (no redeploy), plus the
admin + public endpoints to read and write them. See
[`BRICKS.md`](../../../../BRICKS.md) at the repo root to remove this brick.

The brick is generic; it currently carries one section,
`accountRetention`, owned by the `account-retention` brick.

## Storage — one singleton document

All settings live in **one** Mongo document, `_id: 'app'`, collection
`appsettings` (`SINGLETON_ID` in `app-settings.schema.ts`). An absent
document ⇒ every field falls back to `DEFAULT_SETTINGS`. The schema stores
each section as a free-form sub-object and does **not** validate it —
validation lives in `AppSettingsService` so the schema stays stable as
sections are added.

`AppSettingsService`:

- `get(): Promise<AppSettings>` — loads the doc and deep-merges it over
  `DEFAULT_SETTINGS` via `mergeSettings`, so callers never see `undefined`
  sections or fields.
- `update(patch, { changedBy? }): Promise<AppSettings>` — validates the
  **merged** result (not just the patch), persists a flattened `$set` so a
  partial patch never clobbers a sibling field, emits `settings.updated`,
  returns the merged settings.
- Invalid input throws `ValidationError('INVALID_SETTINGS', …)` → `400`.

`AppSettingsEvents` is an in-process `EventEmitter` (same pattern as
`AuthEvents` / `UserEvents`): `emitUpdated({ changedBy? })` /
`onUpdated(listener)`. The `audit` brick subscribes to log setting
changes; nothing subscribed ⇒ emitting is a no-op.

## Endpoints

| Route                        | Auth              | Body / response                                              |
| ---------------------------- | ----------------- | ----------------------------------------------------------- |
| `GET /api/admin/settings`    | `@Roles('admin')` | → full `AppSettings`                                        |
| `PATCH /api/admin/settings`  | `@Roles('admin')` | `UpdateSettingsDto` (partial, per-section) → full `AppSettings` |
| `GET /api/public/settings`   | none              | → whitelisted subset only (never the whole document)        |

The public controller carries no `@Roles(...)`, so the global
`OptionalJwtAuthGuard` + `RolesGuard` let it through. It hand-picks the
fields it exposes — it must never spread the whole settings object — and
never 500s on a missing document (returns defaults).

## Current section: `accountRetention`

Consumed by the `account-retention` brick.

| Field         | Type            | Rule                                      |
| ------------- | --------------- | ----------------------------------------- |
| `inactiveDays` | `number \| null` | `null` or integer `>= 1`                  |
| `warningDays`  | `number \| null` | `null` or integer `>= 1`; if both set, `warningDays < inactiveDays` |

## Adding a new settings section

1. **`app-settings.defaults.ts`** — add the section to the `AppSettings`
   interface and to `DEFAULT_SETTINGS`, and extend `mergeSettings` to
   deep-merge it over the defaults.
2. **`app-settings.schema.ts`** — add a matching `@Prop({ type: Object,
   default: {} })` field.
3. **`dto/update-settings.dto.ts`** — add a nested
   `class-validator`-decorated patch class and wire it into
   `UpdateSettingsDto` with `@IsOptional() @ValidateNested() @Type(...)`.
4. **`app-settings.service.ts`** — extend `update`'s merge and
   `assertValid` with the new section's rules (cross-field rules go here,
   checked against the merged result).
5. If any field is safe to expose unauthenticated, add it explicitly to
   `PublicSettingsController` (and the `PublicAppSettings` contract).
6. Add service + controller test cases mirroring the existing ones.

## Running unit tests

Run `nx test backend-features-app-settings` to execute the unit tests via
[Jest](https://jestjs.io).
