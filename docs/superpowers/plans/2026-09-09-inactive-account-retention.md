# Inactive-Account Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin configure, at runtime, how many days of inactivity trigger permanent deletion of an account, with an optional warning email a configurable number of days before, and surface that period in the public privacy notice.

**Architecture:** A generic `app-settings` brick stores a single Mongo settings document behind admin `GET`/`PATCH` and a whitelisted public `GET`. A dedicated `account-retention` brick owns a daily `@nestjs/schedule` cron that warns then deletes, plus a listener that stamps `User.lastActiveAt` on login/refresh. The Angular privacy page reads the public endpoint and renders one of two variants. Both settings default to "off" — zero behaviour change until an admin opts in.

**Tech Stack:** NestJS 11 + Mongoose, `@nestjs/schedule` (new dep), Nx 23, Angular 22 (zoneless, standalone, signals), Jest, `class-validator`.

**Spec:** `docs/superpowers/specs/2026-09-09-inactive-account-retention-design.md` — read it alongside this plan.

## Global Constraints

- **Package manager is npm.** Never run `pnpm`. Use `npx nx …` or `./node_modules/.bin/nx`. Node is at `~/.nvm/versions/node/v22.23.2/bin` (add to `PATH`).
- Run tasks through Nx: `npx nx test <project>`, `npx nx lint <project>`, `npx nx run-many …`. Never call jest/eslint directly.
- After adding a lib and wiring it into `apps/backend` or `apps/frontend`, run `npx nx sync` (project references are maintained by `nx sync`, not the generator). CI gate is `nx sync:check`.
- Backend: `tsconfig.base.json` has `isolatedModules` + `emitDecoratorMetadata`. A type used only in a decorated constructor signature that has **any** parameter decorator must be `import type`. Plain class tokens imported as values are fine.
- Backend feature libs live at `libs/backend/features/<name>`; the import alias is `@org/backend-features-<name>`.
- Frontend feature libs live at `libs/frontend/features/<name>`; alias `@org/frontend-features-<name>`.
- Frontend components: `ChangeDetectionStrategy.OnPush`, standalone, zoneless-safe. **Never import `@angular/material/*` directly** — an ESLint `no-restricted-imports` rule requires Material through `@org/frontend-ui` / `@org/frontend-feedback` / `@org/frontend-design`.
- Every brick's env vars are declared in `libs/backend/core/src/lib/config` (`environment-variables.ts` + `ENVIRONMENT_VARIABLE_NAMES` + `validate-env.ts` + an `AppConfigService` getter + both specs) and documented in `.env.example` and the brick README. The generator never patches these.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7
  ```
- Work happens on branch `feat/inactive-account-retention` (already created, holds the spec commit).
- `class-validator` / `class-transformer` are already dependencies. `@nestjs/schedule` is **not** — Task 8 adds it.

---

## File Structure

**New — `app-settings` brick (`libs/backend/features/app-settings/src/lib/`)**
- `app-settings.schema.ts` — Mongoose schema for the singleton document.
- `app-settings.repository.ts` — `BaseRepository` subclass; `loadSingleton()` / `upsertSingleton(patch)`.
- `app-settings.service.ts` — `get()` (merge over defaults), `update(patch)` (validate + persist + emit).
- `app-settings.defaults.ts` — `AppSettings` interface + `DEFAULT_SETTINGS` + `mergeSettings()`.
- `app-settings.events.ts` — `AppSettingsEvents` (`emitUpdated` / `onUpdated`).
- `dto/update-settings.dto.ts` — `class-validator` DTO for `PATCH`.
- `app-settings.controller.ts` — `GET/PATCH /api/admin/settings`.
- `public-settings.controller.ts` — `GET /api/public/settings` (no `@Roles`).
- `app-settings.module.ts` — wires the above + `MongooseModule.forFeature`.
- `index.ts` — public exports.
- Specs: `app-settings.service.spec.ts`, `app-settings.controller.spec.ts`, `app-settings.e2e.spec.ts`.

**New — `account-retention` brick (`libs/backend/features/account-retention/src/lib/`)**
- `account-retention.job.ts` — `AccountRetentionJob` with the `@Cron` method + `run()`.
- `retention-activity.listener.ts` — `RetentionActivityListener` (`OnModuleInit`).
- `account-retention.controller.ts` — `POST /api/admin/account-retention/run` (manual trigger).
- `account-retention.module.ts`.
- `index.ts`.
- Specs: `account-retention.job.spec.ts`, `retention-activity.listener.spec.ts`.
- `README.md`.

**New — frontend `admin-settings` feature (`libs/frontend/features/admin-settings/src/lib/`)**
- `admin-settings.routes.ts`, `admin-settings-page.ts`, `admin-settings.service.ts` + specs.

**New — frontend `PublicSettingsService`**
- `libs/frontend/core/src/lib/public-settings.ts` + spec; exported from `libs/frontend/core/src/index.ts`.

**Modified**
- `libs/backend/features/user/src/lib/user.schema.ts` — `lastActiveAt`, `retentionWarnedAt`.
- `libs/backend/features/user/src/lib/user.service.ts` — `recordActivity()`, `deleteById(id, opts?)`, emit on delete.
- `libs/backend/features/user/src/lib/user.repository.ts` — `stampActivity()` helper.
- `libs/backend/features/user/src/lib/user-events.ts` — `emitDeleted` / `onDeleted`.
- `libs/backend/auth/src/lib/auth-events.ts` — `emitSessionRefreshed` / `onSessionRefreshed`.
- `libs/backend/auth/src/lib/auth.service.ts` — emit `session-refreshed` in `refresh()`.
- `libs/backend/mailer/src/lib/templates/render.ts` — `renderAccountRetentionWarning()` + strings.
- `libs/backend/features/audit/src/lib/audit-actions.ts` — `ACCOUNT_PURGED`, `SETTINGS_CHANGED`.
- `libs/backend/features/audit/src/lib/audit.listeners.ts` — subscribe to `user.deleted` + `settings.updated`.
- `libs/backend/features/audit/src/lib/audit.module.ts` — import `AppSettingsModule`.
- `apps/backend/src/app/app.module.ts` — import `AppSettingsModule`, `AccountRetentionModule`, `ScheduleModule.forRoot()`.
- `libs/backend/core/src/lib/config/*` — `ACCOUNT_RETENTION_CRON`, `ACCOUNT_RETENTION_BATCH_LIMIT`.
- `libs/shared/contracts/src/lib/settings.ts` (new) + `index.ts` — shared `PublicAppSettings` type.
- `apps/frontend/src/app/app.routes.ts` — `admin/settings` child route.
- `apps/frontend/src/app/app.config.ts` — `provideAdminTab({ path: 'settings', order: 30 })`.
- `libs/frontend/consent/src/lib/legal/privacy-policy.page.ts` — dynamic retention section.
- `libs/frontend/consent/src/lib/legal/legal-notice.page.ts` + `cookie-policy.page.ts` — commit the pending manual wording fixes (Task 10 step 1).
- `.env.example`, `GETTING_STARTED.md`, brick READMEs.

---

## Task 1: `app-settings` brick — schema, repository, service, events

**Files:**
- Create: `libs/backend/features/app-settings/**` (via generator, then edited)
- Create: `libs/backend/features/app-settings/src/lib/app-settings.defaults.ts`
- Create: `libs/backend/features/app-settings/src/lib/app-settings.events.ts`
- Modify: `libs/backend/features/app-settings/src/lib/app-settings.schema.ts`
- Modify: `libs/backend/features/app-settings/src/lib/app-settings.repository.ts`
- Modify: `libs/backend/features/app-settings/src/lib/app-settings.service.ts`
- Test: `libs/backend/features/app-settings/src/lib/app-settings.service.spec.ts`

**Interfaces:**
- Produces:
  - `interface AppSettings { accountRetention: { inactiveDays: number | null; warningDays: number | null } }`
  - `const DEFAULT_SETTINGS: AppSettings`
  - `function mergeSettings(stored: Partial<AppSettings> | null | undefined): AppSettings`
  - `class AppSettingsEvents` — `emitUpdated(p: { changedBy?: string }): void`, `onUpdated(l: (p: { changedBy?: string }) => void): void`
  - `class AppSettingsService` — `get(): Promise<AppSettings>`, `update(patch: DeepPartial<AppSettings>, ctx?: { changedBy?: string }): Promise<AppSettings>`
  - `class AppSettingsRepository` — `loadSingleton(): Promise<AppSettingsDocument | null>`, `upsertSingleton(set: Record<string, unknown>): Promise<AppSettingsDocument>`

- [ ] **Step 1: Scaffold the brick with the entity generator**

INVOKE the `nx-generate` skill first (project rule). Then run:

```bash
npx nx g @org/starter-plugin:entity app-settings
```

Expected: creates `libs/backend/features/app-settings` with `app-settings.schema.ts`, `app-settings.repository.ts`, `app-settings.service.ts`, `app-settings.module.ts`, `index.ts`, `project.json`, `package.json`, `tsconfig*.json`. Do **not** pass `--crud` (the controllers here are non-standard: a singleton + a public route).

- [ ] **Step 2: Write `app-settings.defaults.ts`**

```ts
/** Runtime-configurable application settings, stored as one Mongo document.
 * Every field is optional in the store; readers always see a fully
 * populated object via {@link mergeSettings}. */
export interface AppSettings {
  accountRetention: {
    /** Days of inactivity before an account is permanently deleted.
     * `null` ⇒ inactive accounts are never auto-deleted. */
    inactiveDays: number | null;
    /** Days before deletion to email the user a warning.
     * `null` ⇒ no warning email is sent. */
    warningDays: number | null;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  accountRetention: { inactiveDays: null, warningDays: null },
};

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };
export type AppSettingsPatch = DeepPartial<AppSettings>;

/** Deep-merges a stored (possibly partial / stale-shaped) settings object
 * over the defaults, so callers never deal with `undefined` sections. */
export function mergeSettings(
  stored: AppSettingsPatch | null | undefined,
): AppSettings {
  return {
    accountRetention: {
      ...DEFAULT_SETTINGS.accountRetention,
      ...(stored?.accountRetention ?? {}),
    },
  };
}
```

- [ ] **Step 3: Write `app-settings.events.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export interface SettingsUpdatedEvent {
  /** Id of the admin who made the change, when known. */
  changedBy?: string;
}

/** In-process pub/sub for settings changes — same pattern as `AuthEvents`
 * / `UserEvents`. The `app-settings` brick emits; the `audit` brick
 * subscribes. Nothing subscribed ⇒ emitting is a no-op. */
@Injectable()
export class AppSettingsEvents extends EventEmitter {
  emitUpdated(payload: SettingsUpdatedEvent): void {
    this.emit('settings.updated', payload);
  }
  onUpdated(listener: (event: SettingsUpdatedEvent) => void): void {
    this.on('settings.updated', listener);
  }
}
```

- [ ] **Step 4: Replace `app-settings.schema.ts`**

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** The single application-settings document. `_id` is pinned to the
 * constant {@link SINGLETON_ID} so there is only ever one. Sections are
 * stored as free-form sub-objects and validated in `AppSettingsService`,
 * not here — the schema stays stable as new settings are added. */
export const SINGLETON_ID = 'app';

@Schema({ timestamps: true, collection: 'appsettings' })
export class AppSettingsEntity {
  @Prop({ type: String, default: SINGLETON_ID })
  _id!: string;

  @Prop({ type: Object, default: {} })
  accountRetention!: {
    inactiveDays?: number | null;
    warningDays?: number | null;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppSettingsDocument = HydratedDocument<AppSettingsEntity>;
export const AppSettingsSchema = SchemaFactory.createForClass(AppSettingsEntity);
```

- [ ] **Step 5: Replace `app-settings.repository.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppSettingsDocument,
  AppSettingsEntity,
  SINGLETON_ID,
} from './app-settings.schema';

@Injectable()
export class AppSettingsRepository {
  constructor(
    @InjectModel(AppSettingsEntity.name)
    private readonly model: Model<AppSettingsEntity>,
  ) {}

  loadSingleton(): Promise<AppSettingsDocument | null> {
    return this.model.findById(SINGLETON_ID).exec();
  }

  upsertSingleton(set: Record<string, unknown>): Promise<AppSettingsDocument> {
    return this.model
      .findByIdAndUpdate(
        SINGLETON_ID,
        { $set: set, $setOnInsert: { _id: SINGLETON_ID } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec() as Promise<AppSettingsDocument>;
  }
}
```

- [ ] **Step 6: Write the failing service test — `app-settings.service.spec.ts`**

```ts
import { ValidationError } from '@org/backend-core';
import { DEFAULT_SETTINGS } from './app-settings.defaults';
import { AppSettingsEvents } from './app-settings.events';
import { AppSettingsService } from './app-settings.service';

function build(stored: Record<string, unknown> | null = null) {
  const doc = stored ? { toObject: () => stored, ...stored } : null;
  const repo = {
    loadSingleton: jest.fn().mockResolvedValue(doc),
    upsertSingleton: jest.fn().mockImplementation((set: Record<string, unknown>) => {
      // reflect a naive merge back, mimicking Mongo $set on dot-paths
      const next = JSON.parse(JSON.stringify(stored ?? {}));
      for (const [path, value] of Object.entries(set)) {
        const parts = path.split('.');
        let node = next;
        for (const p of parts.slice(0, -1)) node = node[p] ??= {};
        node[parts.at(-1) as string] = value;
      }
      return Promise.resolve({ toObject: () => next, ...next });
    }),
  };
  const events = new AppSettingsEvents();
  const updated = jest.fn();
  events.onUpdated(updated);
  return {
    service: new AppSettingsService(repo as never, events),
    repo,
    updated,
  };
}

describe('AppSettingsService.get', () => {
  it('returns defaults when no document exists', async () => {
    const { service } = build(null);
    await expect(service.get()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial stored document over the defaults', async () => {
    const { service } = build({ accountRetention: { inactiveDays: 200 } });
    await expect(service.get()).resolves.toEqual({
      accountRetention: { inactiveDays: 200, warningDays: null },
    });
  });
});

describe('AppSettingsService.update', () => {
  it('persists a partial patch as dot-path $set and emits settings.updated', async () => {
    const { service, repo, updated } = build({
      accountRetention: { inactiveDays: null, warningDays: null },
    });

    const result = await service.update(
      { accountRetention: { inactiveDays: 180, warningDays: 14 } },
      { changedBy: 'admin-1' },
    );

    expect(repo.upsertSingleton).toHaveBeenCalledWith({
      'accountRetention.inactiveDays': 180,
      'accountRetention.warningDays': 14,
    });
    expect(result.accountRetention).toEqual({ inactiveDays: 180, warningDays: 14 });
    expect(updated).toHaveBeenCalledWith({ changedBy: 'admin-1' });
  });

  it('accepts null to clear a value', async () => {
    const { service, repo } = build({ accountRetention: { inactiveDays: 180, warningDays: 14 } });
    await service.update({ accountRetention: { inactiveDays: null } });
    expect(repo.upsertSingleton).toHaveBeenCalledWith({ 'accountRetention.inactiveDays': null });
  });

  it.each([
    ['zero', { inactiveDays: 0 }],
    ['negative', { inactiveDays: -5 }],
    ['non-integer', { inactiveDays: 1.5 }],
  ])('rejects a %s retention period', async (_label, patch) => {
    const { service } = build();
    await expect(
      service.update({ accountRetention: patch as never }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects warningDays >= inactiveDays against the merged result', async () => {
    const { service } = build({ accountRetention: { inactiveDays: 10, warningDays: null } });
    await expect(
      service.update({ accountRetention: { warningDays: 10 } }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows warningDays alone only when it stays below the stored inactiveDays', async () => {
    const { service, repo } = build({ accountRetention: { inactiveDays: 30, warningDays: null } });
    await service.update({ accountRetention: { warningDays: 7 } });
    expect(repo.upsertSingleton).toHaveBeenCalledWith({ 'accountRetention.warningDays': 7 });
  });
});
```

- [ ] **Step 7: Run the test — verify it fails**

Run: `npx nx test backend-features-app-settings`
Expected: FAIL — `AppSettingsService` constructor arity / `update` not implemented.

- [ ] **Step 8: Write `app-settings.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { ValidationError } from '@org/backend-core';
import { AppSettingsRepository } from './app-settings.repository';
import {
  AppSettings,
  AppSettingsPatch,
  mergeSettings,
} from './app-settings.defaults';
import { AppSettingsEvents } from './app-settings.events';

/** Reads/writes the singleton settings document. Readers get a fully
 * populated {@link AppSettings}; writers send a partial patch that is
 * validated against the *merged* result before it is persisted. */
@Injectable()
export class AppSettingsService {
  constructor(
    private readonly repository: AppSettingsRepository,
    private readonly events: AppSettingsEvents,
  ) {}

  async get(): Promise<AppSettings> {
    const doc = await this.repository.loadSingleton();
    return mergeSettings(doc ? (doc.toObject() as AppSettingsPatch) : null);
  }

  async update(
    patch: AppSettingsPatch,
    ctx: { changedBy?: string } = {},
  ): Promise<AppSettings> {
    const current = await this.get();
    const merged = mergeSettings({
      accountRetention: {
        ...current.accountRetention,
        ...(patch.accountRetention ?? {}),
      },
    });
    this.assertValid(merged);

    const set = flattenPatch(patch);
    const saved = await this.repository.upsertSingleton(set);
    const result = mergeSettings(saved.toObject() as AppSettingsPatch);
    this.events.emitUpdated({ changedBy: ctx.changedBy });
    return result;
  }

  private assertValid(settings: AppSettings): void {
    const { inactiveDays, warningDays } = settings.accountRetention;
    for (const [key, value] of Object.entries({ inactiveDays, warningDays })) {
      if (value !== null && (!Number.isInteger(value) || value < 1)) {
        throw new ValidationError(
          'INVALID_SETTINGS',
          `accountRetention.${key} must be null or a positive integer`,
        );
      }
    }
    if (
      inactiveDays !== null &&
      warningDays !== null &&
      warningDays >= inactiveDays
    ) {
      throw new ValidationError(
        'INVALID_SETTINGS',
        'accountRetention.warningDays must be less than inactiveDays',
      );
    }
  }
}

/** `{ accountRetention: { inactiveDays: 1 } }` → `{ 'accountRetention.inactiveDays': 1 }`
 * so a partial update never clobbers a sibling field. */
function flattenPatch(
  patch: AppSettingsPatch,
  prefix = '',
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flattenPatch(value as AppSettingsPatch, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}
```

- [ ] **Step 9: Update `app-settings.module.ts` providers**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppSettingsEntity, AppSettingsSchema } from './app-settings.schema';
import { AppSettingsEvents } from './app-settings.events';
import { AppSettingsRepository } from './app-settings.repository';
import { AppSettingsService } from './app-settings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppSettingsEntity.name, schema: AppSettingsSchema },
    ]),
  ],
  providers: [AppSettingsRepository, AppSettingsService, AppSettingsEvents],
  exports: [AppSettingsService, AppSettingsEvents],
})
export class AppSettingsModule {}
```

- [ ] **Step 10: Export from `index.ts`**

```ts
export { AppSettingsModule } from './lib/app-settings.module';
export { AppSettingsService } from './lib/app-settings.service';
export { AppSettingsEvents } from './lib/app-settings.events';
export {
  AppSettings,
  AppSettingsPatch,
  DEFAULT_SETTINGS,
  mergeSettings,
} from './lib/app-settings.defaults';
```

- [ ] **Step 11: Run tests + lint — verify pass**

Run: `npx nx test backend-features-app-settings && npx nx lint backend-features-app-settings`
Expected: PASS, 0 errors.

- [ ] **Step 12: Commit**

```bash
git add libs/backend/features/app-settings
git commit -m "feat(app-settings): singleton settings store with validated partial updates

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 2: `app-settings` HTTP layer + audit wiring + AppModule

**Files:**
- Create: `libs/backend/features/app-settings/src/lib/dto/update-settings.dto.ts`
- Create: `libs/backend/features/app-settings/src/lib/app-settings.controller.ts`
- Create: `libs/backend/features/app-settings/src/lib/public-settings.controller.ts`
- Create: `libs/shared/contracts/src/lib/settings.ts`
- Modify: `libs/shared/contracts/src/index.ts`
- Modify: `libs/backend/features/app-settings/src/lib/app-settings.module.ts` (add controllers)
- Modify: `libs/backend/features/app-settings/src/index.ts`
- Modify: `libs/backend/features/audit/src/lib/audit-actions.ts`
- Modify: `libs/backend/features/audit/src/lib/audit.listeners.ts`
- Modify: `libs/backend/features/audit/src/lib/audit.module.ts`
- Modify: `apps/backend/src/app/app.module.ts`
- Test: `libs/backend/features/app-settings/src/lib/app-settings.controller.spec.ts`
- Test: `libs/backend/features/app-settings/src/lib/app-settings.e2e.spec.ts`

**Interfaces:**
- Consumes: `AppSettingsService` (Task 1), `Roles` + `CurrentUser` from `@org/backend-core`, `AuthenticatedUser`.
- Produces:
  - shared contract `interface PublicAppSettings { accountRetention: { inactiveDays: number | null; warningDays: number | null } }`
  - `GET /api/admin/settings` → `AppSettings`
  - `PATCH /api/admin/settings` (body `UpdateSettingsDto`) → `AppSettings`
  - `GET /api/public/settings` → `PublicAppSettings`
  - `AUDIT_ACTION.SETTINGS_CHANGED = 'settings.changed'`, `AUDIT_ACTION.ACCOUNT_PURGED = 'account.purged'`

- [ ] **Step 1: Add the shared contract — `libs/shared/contracts/src/lib/settings.ts`**

```ts
/** The subset of application settings exposed without authentication —
 * consumed by the public privacy notice. */
export interface PublicAppSettings {
  accountRetention: {
    inactiveDays: number | null;
    warningDays: number | null;
  };
}
```

Add to `libs/shared/contracts/src/index.ts` (follow the existing `export *` / re-export style in that file):

```ts
export * from './lib/settings';
```

- [ ] **Step 2: Write the DTO — `dto/update-settings.dto.ts`**

```ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

/** `null` is a meaningful value here ("clear this setting"), so each field
 * is `@IsOptional()` (absent ⇒ unchanged) and additionally allows an
 * explicit `null`. The cross-field rule (warning < retention) is enforced
 * in `AppSettingsService.update` against the merged result. */
class AccountRetentionPatchDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  inactiveDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  warningDays?: number | null;
}

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountRetentionPatchDto)
  accountRetention?: AccountRetentionPatchDto;
}
```

Note: `@IsOptional()` in `class-validator` treats **both** `undefined` and `null` as "skip validation" — exactly the semantics we want here (absent ⇒ unchanged, explicit `null` ⇒ clear the value, a number ⇒ `@IsInt() @Min(1)` applies). `AppSettingsService.update` then re-validates the merged result, so the cross-field rule and the "positive integer" rule are enforced regardless of what the DTO let through.

- [ ] **Step 3: Write the failing controller test — `app-settings.controller.spec.ts`**

```ts
import { AppSettingsController } from './app-settings.controller';
import { PublicSettingsController } from './public-settings.controller';

function svc(overrides: Partial<Record<'get' | 'update', jest.Mock>> = {}) {
  return {
    get: overrides.get ?? jest.fn().mockResolvedValue({
      accountRetention: { inactiveDays: null, warningDays: null },
    }),
    update: overrides.update ?? jest.fn().mockResolvedValue({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    }),
  } as never;
}

describe('AppSettingsController', () => {
  it('GET returns the full settings object', async () => {
    const service = svc();
    const ctrl = new AppSettingsController(service);
    await expect(ctrl.get()).resolves.toEqual({
      accountRetention: { inactiveDays: null, warningDays: null },
    });
  });

  it('PATCH forwards the body and the caller id to the service', async () => {
    const update = jest.fn().mockResolvedValue({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
    const ctrl = new AppSettingsController(svc({ update }));
    await ctrl.patch(
      { accountRetention: { inactiveDays: 180, warningDays: 14 } } as never,
      { id: 'admin-1', roles: ['admin'] } as never,
    );
    expect(update).toHaveBeenCalledWith(
      { accountRetention: { inactiveDays: 180, warningDays: 14 } },
      { changedBy: 'admin-1' },
    );
  });

  it('carries the admin @Roles metadata', () => {
    const roles = Reflect.getMetadata('roles', AppSettingsController);
    expect(roles).toEqual(['admin']);
  });
});

describe('PublicSettingsController', () => {
  it('exposes only the whitelisted accountRetention block', async () => {
    const service = svc({
      get: jest.fn().mockResolvedValue({
        accountRetention: { inactiveDays: 90, warningDays: 7 },
        somethingSecret: 'x',
      }),
    });
    const ctrl = new PublicSettingsController(service);
    await expect(ctrl.get()).resolves.toEqual({
      accountRetention: { inactiveDays: 90, warningDays: 7 },
    });
  });

  it('has no @Roles metadata (route is public)', () => {
    expect(Reflect.getMetadata('roles', PublicSettingsController)).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run it — verify it fails**

Run: `npx nx test backend-features-app-settings`
Expected: FAIL — controllers don't exist.

- [ ] **Step 5: Write `app-settings.controller.ts`**

```ts
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import { AppSettings } from './app-settings.defaults';
import { AppSettingsService } from './app-settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

/** Admin-only settings console. Restricted by the global `RolesGuard`
 * reading `@Roles('admin')` — no local guard needed. */
@ApiTags('settings')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/settings')
export class AppSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Get()
  get(): Promise<AppSettings> {
    return this.service.get();
  }

  @Patch()
  patch(
    @Body() body: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppSettings> {
    return this.service.update(body, { changedBy: user.id });
  }
}
```

- [ ] **Step 6: Write `public-settings.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PublicAppSettings } from '@org/shared-contracts';
import { AppSettingsService } from './app-settings.service';

/** Unauthenticated. No `@Roles(...)`, so the global `OptionalJwtAuthGuard`
 * + `RolesGuard` let it through. Returns only the whitelisted fields — it
 * must never spread the whole settings document. */
@ApiTags('settings')
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Get()
  async get(): Promise<PublicAppSettings> {
    const { accountRetention } = await this.service.get();
    return {
      accountRetention: {
        inactiveDays: accountRetention.inactiveDays,
        warningDays: accountRetention.warningDays,
      },
    };
  }
}
```

- [ ] **Step 7: Register controllers in `app-settings.module.ts`**

Add `controllers: [AppSettingsController, PublicSettingsController]` to the `@Module`.

- [ ] **Step 8: Add audit actions — `audit-actions.ts`**

Add to the `AUDIT_ACTION` object (match the existing `key: 'dotted.string'` style):

```ts
  SETTINGS_CHANGED: 'settings.changed',
  ACCOUNT_PURGED: 'account.purged',
```

- [ ] **Step 9: Subscribe in `audit.listeners.ts`**

Add `AppSettingsEvents` to the constructor (`import { AppSettingsEvents } from '@org/backend-features-app-settings'`) and in `onModuleInit`:

```ts
    this.appSettingsEvents.onUpdated((e) =>
      this.audit.record({
        action: AUDIT_ACTION.SETTINGS_CHANGED,
        actorId: e.changedBy,
        targetType: 'settings',
      }),
    );

    this.userEvents.onDeleted((e) =>
      this.audit.record({
        action:
          e.reason === 'retention'
            ? AUDIT_ACTION.ACCOUNT_PURGED
            : AUDIT_ACTION.ACCOUNT_DELETED,
        actorId: e.reason === 'retention' ? undefined : e.userId,
        target: e.userId,
        targetType: 'user',
        meta: { email: e.email, reason: e.reason },
      }),
    );
```

If `AUDIT_ACTION.ACCOUNT_DELETED` does not already exist, add it: `ACCOUNT_DELETED: 'account.deleted'`. (`userEvents.onDeleted` is delivered by Task 3.)

- [ ] **Step 10: Import `AppSettingsModule` into `audit.module.ts`**

Add `AppSettingsModule` to the `imports` array.

- [ ] **Step 11: Wire `apps/backend/src/app/app.module.ts`**

Add imports:
```ts
import { AppSettingsModule } from '@org/backend-features-app-settings';
```
and add `AppSettingsModule` to the `imports` array (after `UserModule`, before `AuditModule`).

- [ ] **Step 12: `nx sync`**

Run: `npm install && npx nx sync`
Expected: updates `tsconfig` project references for the new lib. Commit any `tsconfig*.json` changes with this task.

- [ ] **Step 13: Write `app-settings.e2e.spec.ts`**

Model it on `libs/backend/features/audit/src/lib/audit.e2e.spec.ts` (same bootstrap helper, `mongodb-memory-server`, supertest). Assert:
- `GET /api/public/settings` → 200, body `{ accountRetention: { inactiveDays: null, warningDays: null } }`, **no auth header**.
- `GET /api/admin/settings` with no token → 401.
- `GET /api/admin/settings` with a non-admin token → 403.
- `PATCH /api/admin/settings` as admin with `{ accountRetention: { inactiveDays: 180, warningDays: 14 } }` → 200; a follow-up `GET /api/public/settings` reflects it.
- `PATCH` as admin with `{ accountRetention: { inactiveDays: 10, warningDays: 10 } }` → 400 `INVALID_SETTINGS`.

- [ ] **Step 14: Run the full brick + audit + backend app tests**

Run: `npx nx run-many -t test lint --projects=backend-features-app-settings,backend-features-audit,backend`
Expected: PASS, 0 lint errors.

- [ ] **Step 15: Commit**

```bash
git add libs/backend/features/app-settings libs/backend/features/audit libs/shared/contracts apps/backend tsconfig.json apps/backend/tsconfig.app.json
git commit -m "feat(app-settings): admin + public settings endpoints, audit on change

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 3: `User` — activity fields, `recordActivity`, `deleted` event

**Files:**
- Modify: `libs/backend/features/user/src/lib/user.schema.ts`
- Modify: `libs/backend/features/user/src/lib/user.repository.ts`
- Modify: `libs/backend/features/user/src/lib/user-events.ts`
- Modify: `libs/backend/features/user/src/lib/user.service.ts`
- Test: `libs/backend/features/user/src/lib/user.service.spec.ts` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `User.lastActiveAt?: Date`, `User.retentionWarnedAt?: Date`
  - `UserRepository.stampActivity(id: string, now: Date): Promise<void>` — sets `lastActiveAt`, unsets `retentionWarnedAt`
  - `UserService.recordActivity(userId: string): Promise<void>` — throttled (skips if `lastActiveAt` newer than 24 h **and** `retentionWarnedAt` unset); never throws
  - `UserService.deleteById(id: string, opts?: { reason?: 'self' | 'retention' }): Promise<void>` — emits `user.deleted`
  - `UserEvents.emitDeleted(p: { userId: string; email: string; reason: 'self' | 'retention' })` / `onDeleted(l)`
  - `UserService.ACTIVITY_THROTTLE_MS = 24 * 60 * 60 * 1000` (exported const)

- [ ] **Step 1: Add schema fields — `user.schema.ts`**

After the `disabledAt` prop:

```ts
  /** Last successful login or refresh-token rotation. Maintained by the
   * `account-retention` brick's activity listener via
   * `UserService.recordActivity`. Absent ⇒ the account has never
   * authenticated; `createdAt` is used as the fallback reference date. */
  @Prop({ index: true })
  lastActiveAt?: Date;

  /** Set when the inactivity-warning email is sent; cleared on any
   * activity. Used by the retention sweep to guarantee the full warning
   * window elapsed before deletion. */
  @Prop()
  retentionWarnedAt?: Date;
```

- [ ] **Step 2: Add `emitDeleted` to `user-events.ts`**

```ts
export interface UserDeletedEvent {
  userId: string;
  email: string;
  /** `self` — the user deleted their own account; `retention` — the
   * inactivity sweep removed it. */
  reason: 'self' | 'retention';
}
```

and in the class:

```ts
  emitDeleted(payload: UserDeletedEvent): void {
    this.emit('user.deleted', payload);
  }
  onDeleted(listener: (event: UserDeletedEvent) => void): void {
    this.on('user.deleted', listener);
  }
```

- [ ] **Step 3: Add `stampActivity` to `user.repository.ts`**

```ts
  /** Records activity in a single write: refresh the timestamp, drop any
   * pending retention warning. */
  async stampActivity(id: string, now: Date): Promise<void> {
    await this.model
      .updateOne(
        { _id: id },
        { $set: { lastActiveAt: now }, $unset: { retentionWarnedAt: 1 } },
      )
      .exec();
  }
```

- [ ] **Step 4: Write the failing service test — `user.service.spec.ts`**

```ts
import { UserService, ACTIVITY_THROTTLE_MS } from './user.service';
import { UserEvents } from './user-events';

function build(user: Record<string, unknown> | null) {
  const repo = {
    findById: jest.fn().mockResolvedValue(user),
    stampActivity: jest.fn().mockResolvedValue(undefined),
    deleteById: jest.fn().mockResolvedValue(true),
  };
  const events = new UserEvents();
  return { service: new UserService(repo as never, events), repo, events };
}

describe('UserService.recordActivity', () => {
  it('stamps when lastActiveAt is unset', async () => {
    const { service, repo } = build({ _id: 'u1', email: 'a@b.c' });
    await service.recordActivity('u1');
    expect(repo.stampActivity).toHaveBeenCalledWith('u1', expect.any(Date));
  });

  it('stamps when lastActiveAt is older than the throttle window', async () => {
    const old = new Date(Date.now() - ACTIVITY_THROTTLE_MS - 1000);
    const { service, repo } = build({ _id: 'u1', lastActiveAt: old });
    await service.recordActivity('u1');
    expect(repo.stampActivity).toHaveBeenCalled();
  });

  it('is a no-op when fresh and not warned', async () => {
    const { service, repo } = build({
      _id: 'u1',
      lastActiveAt: new Date(),
      retentionWarnedAt: undefined,
    });
    await service.recordActivity('u1');
    expect(repo.stampActivity).not.toHaveBeenCalled();
  });

  it('always stamps when a retention warning is pending, even if fresh', async () => {
    const { service, repo } = build({
      _id: 'u1',
      lastActiveAt: new Date(),
      retentionWarnedAt: new Date(),
    });
    await service.recordActivity('u1');
    expect(repo.stampActivity).toHaveBeenCalled();
  });

  it('never throws when the user is gone', async () => {
    const { service } = build(null);
    await expect(service.recordActivity('missing')).resolves.toBeUndefined();
  });
});

describe('UserService.deleteById', () => {
  it('emits user.deleted with reason "self" by default', async () => {
    const { service, events } = build({ _id: 'u1', email: 'a@b.c' });
    const onDeleted = jest.fn();
    events.onDeleted(onDeleted);
    await service.deleteById('u1');
    expect(onDeleted).toHaveBeenCalledWith({
      userId: 'u1',
      email: 'a@b.c',
      reason: 'self',
    });
  });

  it('emits reason "retention" when asked', async () => {
    const { service, events } = build({ _id: 'u1', email: 'a@b.c' });
    const onDeleted = jest.fn();
    events.onDeleted(onDeleted);
    await service.deleteById('u1', { reason: 'retention' });
    expect(onDeleted.mock.calls[0][0].reason).toBe('retention');
  });
});
```

Note: the real `UserService` constructor also takes `UserEvents` and an optional `roleCatalog`. The 2-arg `new UserService(repo, events)` call works because the 3rd param is `@Optional()`. If the constructor signature differs when you get there, adapt the `build()` helper — do not change production signatures to fit the test.

- [ ] **Step 5: Run it — verify it fails**

Run: `npx nx test backend-features-user`
Expected: FAIL — `recordActivity` / `ACTIVITY_THROTTLE_MS` undefined.

- [ ] **Step 6: Implement in `user.service.ts`**

Add near the top-level constants:

```ts
/** Minimum gap between two `lastActiveAt` writes for one account — avoids
 * a DB write on every 15-minute token refresh. */
export const ACTIVITY_THROTTLE_MS = 24 * 60 * 60 * 1000;
```

Add the methods:

```ts
  /** Records that the account authenticated (login or refresh). Throttled,
   * and deliberately swallowing errors — a failed stamp must never break a
   * sign-in. */
  async recordActivity(userId: string): Promise<void> {
    try {
      const user = await this.repository.findById(userId);
      if (!user) return;
      const fresh =
        user.lastActiveAt != null &&
        Date.now() - user.lastActiveAt.getTime() < ACTIVITY_THROTTLE_MS;
      if (fresh && user.retentionWarnedAt == null) return;
      await this.repository.stampActivity(userId, new Date());
    } catch {
      // best-effort; never propagate to the auth flow
    }
  }
```

Change `deleteById`:

```ts
  async deleteById(
    id: string,
    opts: { reason?: 'self' | 'retention' } = {},
  ): Promise<void> {
    const user = await this.repository.findById(id);
    const deleted = await this.repository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('USER_NOT_FOUND', 'User not found');
    }
    this.events.emitDeleted({
      userId: id,
      email: user?.email ?? '',
      reason: opts.reason ?? 'self',
    });
  }
```

Also update `deleteAccount` (the self-service password-confirmed path) to emit — replace its final `await this.repository.deleteById(id);` with `await this.deleteById(id, { reason: 'self' });`.

- [ ] **Step 7: Run tests + lint**

Run: `npx nx run-many -t test lint --projects=backend-features-user`
Expected: PASS. Watch for TS1272 on `UserDeletedEvent` — it's a plain interface import in a non-decorated file, so no `import type` needed here.

- [ ] **Step 8: Commit**

```bash
git add libs/backend/features/user
git commit -m "feat(user): lastActiveAt tracking, recordActivity, user.deleted event

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 4: `auth` — `session-refreshed` event

**Files:**
- Modify: `libs/backend/auth/src/lib/auth-events.ts`
- Modify: `libs/backend/auth/src/lib/auth.service.ts`
- Test: `libs/backend/auth/src/lib/auth.service.spec.ts` (add a case, or new file if none exists — check first)

**Interfaces:**
- Produces: `AuthEvents.emitSessionRefreshed(p: { userId: string }): void`, `AuthEvents.onSessionRefreshed(l: (e: { userId: string }) => void): void`, emitted from `AuthService.refresh` after a successful rotation.

- [ ] **Step 1: Add the event to `auth-events.ts`**

```ts
export interface SessionRefreshedEvent {
  userId: string;
}
```

and in the class, next to `emitLoginSucceeded`:

```ts
  emitSessionRefreshed(payload: SessionRefreshedEvent): void {
    this.emit('auth.session-refreshed', payload);
  }
  onSessionRefreshed(listener: (event: SessionRefreshedEvent) => void): void {
    this.on('auth.session-refreshed', listener);
  }
```

- [ ] **Step 2: Write the failing test**

In `auth.service.spec.ts` (or a new `auth.service.refresh.spec.ts` if the file doesn't exist — check `libs/backend/auth/src/lib/` first):

```ts
it('emits auth.session-refreshed after a successful rotation', async () => {
  // build an AuthService with refreshTokens.rotate mocked to resolve
  // { userId: 'u1', issued: <fake issued token> } and currentRoles → []
  const events = new AuthEvents();
  const onRefreshed = jest.fn();
  events.onSessionRefreshed(onRefreshed);
  // ...construct service with `events` injected...

  await service.refresh('some-refresh-token', {});

  expect(onRefreshed).toHaveBeenCalledWith({ userId: 'u1' });
});
```

Follow whatever construction/mocking pattern the existing auth service tests use. If there is genuinely no unit coverage of `AuthService`, add the minimal harness: mock `RefreshTokenService`, `JwtService`, `AppConfigService`, `UserService`, `AuthEvents`.

- [ ] **Step 3: Run it — verify it fails**

Run: `npx nx test backend-auth`
Expected: FAIL — event never emitted.

- [ ] **Step 4: Emit from `auth.service.ts`**

In `refresh()`, after `const { userId, issued } = await this.refreshTokens.rotate(...)`:

```ts
    this.events.emitSessionRefreshed({ userId });
```

(The service already has `this.events` — it emits `auth.login-succeeded` today. Confirm the field name; adapt if it's named differently.)

- [ ] **Step 5: Run tests + lint — verify pass**

Run: `npx nx run-many -t test lint --projects=backend-auth`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/backend/auth
git commit -m "feat(auth): emit auth.session-refreshed on token rotation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 5: `account-retention` brick — scaffold, dep, activity listener

**Files:**
- Create: `libs/backend/features/account-retention/**` (generator `feature`, then edited)
- Create: `libs/backend/features/account-retention/src/lib/retention-activity.listener.ts`
- Modify: `libs/backend/features/account-retention/src/lib/account-retention.module.ts`
- Modify: `libs/backend/features/account-retention/package.json` (add `@nestjs/schedule`)
- Modify: root `package.json` (add `@nestjs/schedule`)
- Modify: `apps/backend/src/app/app.module.ts` (`ScheduleModule.forRoot()`, `AccountRetentionModule`)
- Test: `libs/backend/features/account-retention/src/lib/retention-activity.listener.spec.ts`

**Interfaces:**
- Consumes: `AuthEvents.onLoginSucceeded` / `.onSessionRefreshed` (Task 4), `UserService.recordActivity` (Task 3), `AppSettingsService` (Task 1).
- Produces: `RetentionActivityListener` (an `OnModuleInit` provider), `AccountRetentionModule`.

- [ ] **Step 1: Scaffold**

INVOKE `nx-generate` skill. Then:

```bash
npx nx g @org/starter-plugin:feature account-retention
```

Expected: minimal `libs/backend/features/account-retention` with `account-retention.module.ts`, `index.ts`, `project.json`, `package.json`, `tsconfig*.json`. Delete any generated placeholder service/controller/spec that the `feature` generator adds if it doesn't fit (keep the module + index).

- [ ] **Step 2: Add `@nestjs/schedule`**

Check the version compatible with the repo's NestJS 11: `npx nx_docs` is not needed — use `npm view @nestjs/schedule versions` and pick the latest `4.x` (NestJS 11 compatible). Add it to **both**:
- root `package.json` `dependencies`
- `libs/backend/features/account-retention/package.json` `dependencies` (the generator reads a lib's own `dependencies` when bundling).

```bash
npm install @nestjs/schedule@^4
```

If `npm install` hits the `@unrs/resolver-binding-linux-x64-gnu` 404 in this sandbox, retry with:
```bash
npm_config_registry=https://registry.npmjs.org/ UNRS_RESOLVER_FORCE_WASM=1 npm install @nestjs/schedule@^4
```

- [ ] **Step 3: Write the failing listener test — `retention-activity.listener.spec.ts`**

```ts
import { AuthEvents } from '@org/backend-auth';
import { RetentionActivityListener } from './retention-activity.listener';

describe('RetentionActivityListener', () => {
  it('calls recordActivity on login and on refresh', () => {
    const authEvents = new AuthEvents();
    const userService = { recordActivity: jest.fn().mockResolvedValue(undefined) };
    const listener = new RetentionActivityListener(
      authEvents,
      userService as never,
    );

    listener.onModuleInit();

    authEvents.emitLoginSucceeded({ userId: 'u1', method: 'password' });
    authEvents.emitSessionRefreshed({ userId: 'u2' });

    expect(userService.recordActivity).toHaveBeenNthCalledWith(1, 'u1');
    expect(userService.recordActivity).toHaveBeenNthCalledWith(2, 'u2');
  });
});
```

- [ ] **Step 4: Run it — verify it fails**

Run: `npx nx test backend-features-account-retention`
Expected: FAIL — listener does not exist.

- [ ] **Step 5: Write `retention-activity.listener.ts`**

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthEvents } from '@org/backend-auth';
import { UserService } from '@org/backend-features-user';

/** Stamps `User.lastActiveAt` whenever an account authenticates. Mirrors
 * the `audit` brick's `AuditListeners`: the `auth` brick only emits, it
 * never imports this module, so `account-retention` stays optional. */
@Injectable()
export class RetentionActivityListener implements OnModuleInit {
  constructor(
    private readonly authEvents: AuthEvents,
    private readonly users: UserService,
  ) {}

  onModuleInit(): void {
    this.authEvents.onLoginSucceeded((e) => {
      void this.users.recordActivity(e.userId);
    });
    this.authEvents.onSessionRefreshed((e) => {
      void this.users.recordActivity(e.userId);
    });
  }
}
```

- [ ] **Step 6: Write `account-retention.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { AuthModule } from '@org/backend-auth';
import { AppSettingsModule } from '@org/backend-features-app-settings';
import { UserModule } from '@org/backend-features-user';
import { RetentionActivityListener } from './retention-activity.listener';

/** Inactive-account retention: stamps activity on auth, and (Task 7) runs
 * a daily warn-then-delete sweep driven by `app-settings`. Uses the global
 * `MailerService`. `@nestjs/schedule`'s `ScheduleModule.forRoot()` is
 * registered once in `apps/backend`. */
@Module({
  imports: [AuthModule, UserModule, AppSettingsModule],
  providers: [RetentionActivityListener],
})
export class AccountRetentionModule {}
```

- [ ] **Step 7: Wire `apps/backend/src/app/app.module.ts`**

```ts
import { ScheduleModule } from '@nestjs/schedule';
import { AccountRetentionModule } from '@org/backend-features-account-retention';
```

Add `ScheduleModule.forRoot()` and `AccountRetentionModule` to `imports` (retention module last).

- [ ] **Step 8: `nx sync` + lockfile check**

```bash
npm install && npx nx sync
npm ci   # verify the lock resolves cleanly; if it fails "Missing X from lock file", run `npm install` again (2–3 passes) until "up to date"
```

- [ ] **Step 9: Run tests + lint + backend build**

Run: `npx nx run-many -t test lint --projects=backend-features-account-retention,backend && npx nx build backend`
Expected: PASS. The backend boots with `ScheduleModule` registered.

- [ ] **Step 10: Commit**

```bash
git add libs/backend/features/account-retention apps/backend package.json package-lock.json tsconfig.json apps/backend/tsconfig.app.json
git commit -m "feat(account-retention): brick scaffold + activity listener + @nestjs/schedule

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 6: Warning email template

**Files:**
- Modify: `libs/backend/mailer/src/lib/templates/render.ts`
- Test: `libs/backend/mailer/src/lib/templates/render.spec.ts`

**Interfaces:**
- Produces: `renderAccountRetentionWarning(params: { firstName: string; lastActiveOn: string; deletionOn: string; url: string; locale?: string }): RenderedEmail`

- [ ] **Step 1: Write the failing test — add to `render.spec.ts`**

```ts
import { renderAccountRetentionWarning } from './render';

describe('renderAccountRetentionWarning', () => {
  const params = {
    firstName: 'Ada',
    lastActiveOn: '1 January 2026',
    deletionOn: '1 July 2026',
    url: 'https://app.example/app/profile',
    locale: 'en',
  };

  it('states the deletion date in subject-free body text (en)', () => {
    const mail = renderAccountRetentionWarning(params);
    expect(mail.subject).toMatch(/account/i);
    expect(mail.text).toContain('1 July 2026');
    expect(mail.text).toContain(params.url);
    expect(mail.html).toContain('1 July 2026');
  });

  it('is localised to French', () => {
    const mail = renderAccountRetentionWarning({ ...params, locale: 'fr' });
    expect(mail.subject).toMatch(/compte/i);
    expect(mail.text).toContain('1 July 2026');
  });

  it('falls back to English for an unknown locale', () => {
    const mail = renderAccountRetentionWarning({ ...params, locale: 'de' });
    expect(mail.subject).toMatch(/account/i);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx nx test backend-mailer`
Expected: FAIL — export missing.

- [ ] **Step 3: Implement in `render.ts`**

Extend the `EMAIL_STRINGS` map: add a `retentionWarning` block to both `en` and `fr`:

```ts
    retentionWarning: {
      subject: 'Your account is scheduled for deletion',
      intro: (firstName: string) =>
        `Hi ${firstName}, your account has been inactive since {lastActiveOn}.`,
      warn: (deletionOn: string) =>
        `To comply with our data-retention policy it will be permanently deleted on ${deletionOn}.`,
      keep: 'To keep your account, just sign in before then:',
    },
```

French:

```ts
    retentionWarning: {
      subject: 'Votre compte va être supprimé',
      intro: (firstName: string) =>
        `Bonjour ${firstName}, votre compte est inactif depuis {lastActiveOn}.`,
      warn: (deletionOn: string) =>
        `Conformément à notre politique de conservation des données, il sera définitivement supprimé le ${deletionOn}.`,
      keep: 'Pour conserver votre compte, connectez-vous avant cette date :',
    },
```

(Keep the `{lastActiveOn}` interpolation simple — do a `.replace('{lastActiveOn}', lastActiveOn)` in the render function; match whatever interpolation style the neighbouring `reset.action(m)` uses. If the neighbours use a function arg, use a function arg here too for consistency.)

Then the renderer, alongside `renderWelcome`:

```ts
export function renderAccountRetentionWarning(params: {
  firstName: string;
  lastActiveOn: string;
  deletionOn: string;
  url: string;
  locale?: string;
}): RenderedEmail {
  const { firstName, lastActiveOn, deletionOn, url, locale } = params;
  const name = firstName.trim() || 'there';
  const t = stringsFor(locale).retentionWarning;
  const intro = t.intro(name).replace('{lastActiveOn}', lastActiveOn);
  return {
    subject: t.subject,
    text: [intro, '', t.warn(deletionOn), '', t.keep, url].join('\n'),
    html: layout(t.subject, [
      escapeHtml(intro),
      escapeHtml(t.warn(deletionOn)),
      escapeHtml(t.keep),
      link(url),
    ]),
  };
}
```

Adjust `stringsFor`'s return type so `retentionWarning` is part of the `EMAIL_STRINGS` value type.

- [ ] **Step 4: Run tests + lint — verify pass**

Run: `npx nx run-many -t test lint --projects=backend-mailer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/backend/mailer
git commit -m "feat(mailer): account-retention warning email template (en/fr)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 7: `AccountRetentionJob` — warn + delete sweep

**Files:**
- Create: `libs/backend/features/account-retention/src/lib/account-retention.job.ts`
- Create: `libs/backend/features/account-retention/src/lib/account-retention.controller.ts`
- Modify: `libs/backend/features/account-retention/src/lib/account-retention.module.ts`
- Modify: `libs/backend/features/user/src/lib/user.repository.ts` (add `findRetentionCandidates`)
- Modify: `libs/backend/features/user/src/lib/user.service.ts` (expose `findRetentionCandidates`, `markRetentionWarned`)
- Test: `libs/backend/features/account-retention/src/lib/account-retention.job.spec.ts`
- Test: add cases to `libs/backend/features/user/src/lib/user.service.spec.ts`

**Interfaces:**
- Consumes: `AppSettingsService.get()`, `MailerService.send()`, `UserService`, `AppConfigService.accountRetention` (Task 8 — until then read `process.env` with the same defaults; Task 8 swaps it).
- Produces:
  - `UserRepository.findRetentionCandidates(opts: { before: Date; onlyUnwarned?: boolean; warnedBefore?: Date; limit: number }): Promise<UserDocument[]>`
  - `UserService.findRetentionCandidates(opts)` — passthrough
  - `UserService.markRetentionWarned(id: string, at: Date): Promise<void>`
  - `AccountRetentionJob.run(now?: Date): Promise<{ warned: number; deleted: number }>`
  - `POST /api/admin/account-retention/run` → `{ warned: number; deleted: number }`

- [ ] **Step 1: Add `findRetentionCandidates` + `markRetentionWarned` to `user.repository.ts`**

```ts
  /** Accounts eligible for the retention sweep: reference date
   * (`lastActiveAt`, falling back to `createdAt`) at or before `before`,
   * never `admin`, never disabled. `onlyUnwarned` restricts to accounts
   * with no pending warning; `warnedBefore` restricts to accounts warned
   * at or before that instant. */
  async findRetentionCandidates(opts: {
    before: Date;
    onlyUnwarned?: boolean;
    warnedBefore?: Date;
    limit: number;
  }): Promise<UserDocument[]> {
    const query: Record<string, unknown> = {
      roles: { $ne: 'admin' },
      disabledAt: { $in: [null, undefined] },
      $expr: {
        $lte: [{ $ifNull: ['$lastActiveAt', '$createdAt'] }, opts.before],
      },
    };
    if (opts.onlyUnwarned) {
      query['retentionWarnedAt'] = { $in: [null, undefined] };
    }
    if (opts.warnedBefore) {
      query['retentionWarnedAt'] = { $ne: null, $lte: opts.warnedBefore };
    }
    return this.model.find(query).limit(opts.limit).exec();
  }

  async markRetentionWarned(id: string, at: Date): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { retentionWarnedAt: at } }).exec();
  }
```

- [ ] **Step 2: Passthroughs in `user.service.ts`**

```ts
  findRetentionCandidates(opts: {
    before: Date;
    onlyUnwarned?: boolean;
    warnedBefore?: Date;
    limit: number;
  }): Promise<UserDocument[]> {
    return this.repository.findRetentionCandidates(opts);
  }

  markRetentionWarned(id: string, at: Date): Promise<void> {
    return this.repository.markRetentionWarned(id, at);
  }
```

Add a spec case in `user.service.spec.ts` asserting each option maps to the expected repo call (mock `findRetentionCandidates`).

- [ ] **Step 3: Write the failing job test — `account-retention.job.spec.ts`**

```ts
import { AccountRetentionJob } from './account-retention.job';

const DAY = 24 * 60 * 60 * 1000;

function build(settings: {
  inactiveDays: number | null;
  warningDays: number | null;
}) {
  const users = {
    findRetentionCandidates: jest.fn().mockResolvedValue([]),
    markRetentionWarned: jest.fn().mockResolvedValue(undefined),
    deleteById: jest.fn().mockResolvedValue(undefined),
  };
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const appSettings = {
    get: jest.fn().mockResolvedValue({ accountRetention: settings }),
  };
  const config = { accountRetention: { cron: '0 3 * * *', batchLimit: 1000 } };
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const job = new AccountRetentionJob(
    appSettings as never,
    users as never,
    mailer as never,
    config as never,
    logger as never,
  );
  return { job, users, mailer, appSettings };
}

const NOW = new Date('2026-06-01T03:00:00.000Z');

describe('AccountRetentionJob.run', () => {
  it('does nothing when inactiveDays is null', async () => {
    const { job, users } = build({ inactiveDays: null, warningDays: null });
    const result = await job.run(NOW);
    expect(result).toEqual({ warned: 0, deleted: 0 });
    expect(users.findRetentionCandidates).not.toHaveBeenCalled();
  });

  it('warns accounts entering the window and stamps retentionWarnedAt', async () => {
    const { job, users, mailer } = build({ inactiveDays: 180, warningDays: 14 });
    users.findRetentionCandidates
      .mockResolvedValueOnce([
        { _id: 'u1', email: 'u1@x.y', firstName: 'A', locale: 'en',
          lastActiveAt: new Date(NOW.getTime() - 170 * DAY), createdAt: new Date(0) },
      ]) // warn phase
      .mockResolvedValueOnce([]); // delete phase

    const result = await job.run(NOW);

    expect(users.findRetentionCandidates).toHaveBeenNthCalledWith(1, {
      before: new Date(NOW.getTime() - (180 - 14) * DAY),
      onlyUnwarned: true,
      limit: 1000,
    });
    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(users.markRetentionWarned).toHaveBeenCalledWith('u1', NOW);
    expect(result.warned).toBe(1);
  });

  it('deletes only accounts warned at least warningDays ago', async () => {
    const { job, users } = build({ inactiveDays: 180, warningDays: 14 });
    users.findRetentionCandidates
      .mockResolvedValueOnce([]) // warn phase
      .mockResolvedValueOnce([
        { _id: 'u2', email: 'u2@x.y', firstName: 'B',
          lastActiveAt: new Date(NOW.getTime() - 200 * DAY), createdAt: new Date(0),
          retentionWarnedAt: new Date(NOW.getTime() - 15 * DAY) },
      ]);

    const result = await job.run(NOW);

    expect(users.findRetentionCandidates).toHaveBeenNthCalledWith(2, {
      before: new Date(NOW.getTime() - 180 * DAY),
      warnedBefore: new Date(NOW.getTime() - 14 * DAY),
      limit: 1000,
    });
    expect(users.deleteById).toHaveBeenCalledWith('u2', { reason: 'retention' });
    expect(result.deleted).toBe(1);
  });

  it('with warningDays null, deletes past-threshold accounts with no email', async () => {
    const { job, users, mailer } = build({ inactiveDays: 90, warningDays: null });
    users.findRetentionCandidates.mockResolvedValueOnce([
      { _id: 'u3', email: 'u3@x.y', firstName: 'C',
        lastActiveAt: new Date(NOW.getTime() - 100 * DAY), createdAt: new Date(0) },
    ]);

    const result = await job.run(NOW);

    // warn phase skipped entirely
    expect(mailer.send).not.toHaveBeenCalled();
    expect(users.findRetentionCandidates).toHaveBeenCalledTimes(1);
    expect(users.findRetentionCandidates).toHaveBeenCalledWith({
      before: new Date(NOW.getTime() - 90 * DAY),
      limit: 1000,
    });
    expect(users.deleteById).toHaveBeenCalledWith('u3', { reason: 'retention' });
    expect(result.deleted).toBe(1);
  });

  it('leaves retentionWarnedAt unset if the email send throws', async () => {
    const { job, users, mailer } = build({ inactiveDays: 180, warningDays: 14 });
    mailer.send.mockRejectedValueOnce(new Error('smtp down'));
    users.findRetentionCandidates
      .mockResolvedValueOnce([
        { _id: 'u4', email: 'u4@x.y', firstName: 'D',
          lastActiveAt: new Date(NOW.getTime() - 170 * DAY), createdAt: new Date(0) },
      ])
      .mockResolvedValueOnce([]);

    const result = await job.run(NOW);

    expect(users.markRetentionWarned).not.toHaveBeenCalled();
    expect(result.warned).toBe(0);
  });
});
```

- [ ] **Step 4: Run it — verify it fails**

Run: `npx nx test backend-features-account-retention`
Expected: FAIL — `AccountRetentionJob` does not exist.

- [ ] **Step 5: Write `account-retention.job.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppConfigService, AppLogger } from '@org/backend-core';
import { AppSettingsService } from '@org/backend-features-app-settings';
import { UserService } from '@org/backend-features-user';
import { MailerService } from '@org/backend-mailer';
import { renderAccountRetentionWarning } from '@org/backend-mailer';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily sweep: email a warning to accounts nearing the inactivity limit,
 * then permanently delete accounts past it that have had their full
 * warning window. Both thresholds come from `app-settings` at runtime;
 * when `inactiveDays` is null the sweep is a no-op. */
@Injectable()
export class AccountRetentionJob {
  constructor(
    private readonly settings: AppSettingsService,
    private readonly users: UserService,
    private readonly mailer: MailerService,
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {}

  @Cron(process.env['ACCOUNT_RETENTION_CRON'] ?? '0 3 * * *', {
    name: 'account-retention-sweep',
  })
  handleCron(): Promise<{ warned: number; deleted: number }> {
    return this.run();
  }

  async run(now: Date = new Date()): Promise<{ warned: number; deleted: number }> {
    const { inactiveDays, warningDays } = (
      await this.settings.get()
    ).accountRetention;
    if (inactiveDays == null) {
      return { warned: 0, deleted: 0 };
    }
    const limit = this.config.accountRetention.batchLimit;
    const doWarn = warningDays != null && warningDays < inactiveDays;

    let warned = 0;
    if (doWarn) {
      const before = new Date(now.getTime() - (inactiveDays - warningDays) * DAY_MS);
      const candidates = await this.users.findRetentionCandidates({
        before,
        onlyUnwarned: true,
        limit,
      });
      for (const user of candidates) {
        const reference = user.lastActiveAt ?? user.createdAt;
        const deletionOn = new Date(reference.getTime() + inactiveDays * DAY_MS);
        try {
          const mail = renderAccountRetentionWarning({
            firstName: user.firstName,
            lastActiveOn: formatDate(reference, user.locale),
            deletionOn: formatDate(deletionOn, user.locale),
            url: `${this.config.oidc?.frontendUrl ?? ''}/app/profile`,
            locale: user.locale,
          });
          await this.mailer.send({ to: user.email, ...mail });
          await this.users.markRetentionWarned(user._id.toString(), now);
          warned++;
        } catch (error) {
          this.logger.error(
            `retention warning email failed for ${user._id}: ${String(error)}`,
            undefined,
            'AccountRetentionJob',
          );
        }
      }
    }

    const deleteBefore = new Date(now.getTime() - inactiveDays * DAY_MS);
    const deletable = await this.users.findRetentionCandidates(
      doWarn
        ? {
            before: deleteBefore,
            warnedBefore: new Date(now.getTime() - warningDays * DAY_MS),
            limit,
          }
        : { before: deleteBefore, limit },
    );
    let deleted = 0;
    for (const user of deletable) {
      try {
        await this.users.deleteById(user._id.toString(), { reason: 'retention' });
        deleted++;
      } catch (error) {
        this.logger.error(
          `retention delete failed for ${user._id}: ${String(error)}`,
          undefined,
          'AccountRetentionJob',
        );
      }
    }

    this.logger.log(
      `retention sweep: warned=${warned} deleted=${deleted}`,
      'AccountRetentionJob',
    );
    return { warned, deleted };
  }
}

function formatDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
```

Notes for the implementer:
- Confirm `AppLogger` is the logger class exported by `@org/backend-core` (the mailer brick injects it). If the token differs, match the mailer brick.
- `this.config.oidc?.frontendUrl` — check `AppConfigService` for the frontend URL getter (`OIDC_FRONTEND_URL` exists). If there's no general "app URL", read `process.env['OIDC_FRONTEND_URL'] ?? ''` and leave a `// TODO: a dedicated APP_URL would be cleaner` — do **not** invent a new env var in this task.
- The test constructs the job with a plain `config` object `{ accountRetention: { batchLimit: 1000 } }`; keep the constructor param order matching the test.

- [ ] **Step 6: Write `account-retention.controller.ts`**

```ts
import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@org/backend-core';
import { AccountRetentionJob } from './account-retention.job';

/** Manual trigger for the retention sweep — same logic as the daily cron.
 * Admin-only. Useful for ops and for verifying configuration. */
@ApiTags('account-retention')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/account-retention')
export class AccountRetentionController {
  constructor(private readonly job: AccountRetentionJob) {}

  @Post('run')
  @HttpCode(200)
  run(): Promise<{ warned: number; deleted: number }> {
    return this.job.run();
  }
}
```

- [ ] **Step 7: Update `account-retention.module.ts`**

Add `MailerModule` is global (no import needed — confirm; the `auth-reset` brick uses `MailerService` without importing `MailerModule`). Add:

```ts
  providers: [RetentionActivityListener, AccountRetentionJob],
  controllers: [AccountRetentionController],
```

Keep `imports: [AuthModule, UserModule, AppSettingsModule]`. `AppConfigModule` — add it if `AppConfigService` isn't otherwise visible (it's `@Global` in most setups; check `libs/backend/core`).

- [ ] **Step 8: Run tests + lint**

Run: `npx nx run-many -t test lint --projects=backend-features-account-retention,backend-features-user`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add libs/backend/features/account-retention libs/backend/features/user
git commit -m "feat(account-retention): daily warn-then-delete sweep + manual trigger

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 8: Backend config + docs

**Files:**
- Modify: `libs/backend/core/src/lib/config/environment-variables.ts`
- Modify: `libs/backend/core/src/lib/config/validate-env.ts`
- Modify: `libs/backend/core/src/lib/config/app-config.service.ts`
- Modify: `libs/backend/core/src/lib/config/validate-env.spec.ts`
- Modify: `libs/backend/core/src/lib/config/app-config.service.spec.ts`
- Modify: `libs/backend/features/account-retention/src/lib/account-retention.job.ts` (use `config.accountRetention.cron`)
- Modify: `.env.example`
- Create: `libs/backend/features/account-retention/README.md`
- Modify: `libs/backend/features/app-settings/README.md` (generator may have created one; otherwise create)

**Interfaces:**
- Produces: `AppConfigService.accountRetention` → `{ cron: string; batchLimit: number }` (defaults `'0 3 * * *'`, `1000`).

- [ ] **Step 1: Add to `EnvironmentVariables` + `ENVIRONMENT_VARIABLE_NAMES`**

```ts
  /** Cron expression for the inactive-account retention sweep (default
   * `0 3 * * *` — daily at 03:00). `account-retention` brick. */
  ACCOUNT_RETENTION_CRON?: string;
  /** Max accounts warned and max deleted per sweep run (default 1000).
   * `account-retention` brick. */
  ACCOUNT_RETENTION_BATCH_LIMIT?: number;
```

Append both names to `ENVIRONMENT_VARIABLE_NAMES`.

- [ ] **Step 2: Add validation in `validate-env.ts`**

Follow the `AUDIT_RETENTION_DAYS` pattern (`parseOptionalNonNegativeInt` / a positive-int helper). `ACCOUNT_RETENTION_BATCH_LIMIT` must be a positive integer if set. `ACCOUNT_RETENTION_CRON` — accept any non-empty string (a full cron-expression validator is out of scope; `@nestjs/schedule` throws on boot for a bad expression, which is acceptable). Add both to the returned object conditionally, like `AUDIT_RETENTION_DAYS`.

- [ ] **Step 3: Add the getter in `app-config.service.ts`**

```ts
  get accountRetention() {
    return {
      cron:
        this.configService.get('ACCOUNT_RETENTION_CRON', { infer: true }) ??
        '0 3 * * *',
      batchLimit:
        this.configService.get('ACCOUNT_RETENTION_BATCH_LIMIT', { infer: true }) ??
        1000,
    };
  }
```

- [ ] **Step 4: Update the job to use the config cron**

`@Cron` needs the expression at decoration time, so it still reads `process.env['ACCOUNT_RETENTION_CRON'] ?? '0 3 * * *'` directly (a decorator can't see DI). Add a one-line comment saying so. `batchLimit` **is** read via `this.config.accountRetention.batchLimit` (already in Task 7). No functional change here beyond the comment — but add a `validate-env` guarantee that the env value is sane.

- [ ] **Step 5: Update the config specs**

In `validate-env.spec.ts`: a valid `ACCOUNT_RETENTION_BATCH_LIMIT` passes; `0` / negative / non-integer throws; absent ⇒ key omitted. In `app-config.service.spec.ts`: `accountRetention` returns the defaults when unset and the parsed values when set.

- [ ] **Step 6: `.env.example`**

Add, in the section style already used there:

```dotenv
# --- Inactive-account retention (account-retention brick) ---
# Accounts are only ever auto-deleted once an admin sets a retention period
# in the admin console (Settings tab). These knobs are operational only.
# ACCOUNT_RETENTION_CRON="0 3 * * *"
# ACCOUNT_RETENTION_BATCH_LIMIT=1000
```

- [ ] **Step 7: Brick READMEs**

`libs/backend/features/account-retention/README.md` — what the brick does, the two `app-settings` fields, the two env vars, the `POST /api/admin/account-retention/run` endpoint, the "admin & disabled accounts are never purged" rule, and that `lastActiveAt` falls back to `createdAt`. `libs/backend/features/app-settings/README.md` — the singleton doc, `GET/PATCH /api/admin/settings`, `GET /api/public/settings`, how to add a new settings section.

- [ ] **Step 8: Run the config + brick tests + a real `npm ci`**

Run:
```bash
npx nx run-many -t test lint --projects=backend-core,backend-features-account-retention
npm ci
```
Expected: PASS; `npm ci` clean.

- [ ] **Step 9: Commit**

```bash
git add libs/backend/core .env.example libs/backend/features/account-retention libs/backend/features/app-settings package-lock.json
git commit -m "feat(account-retention): env config (cron, batch limit) + brick docs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 9: Frontend `admin-settings` feature

**Files:**
- Create: `libs/frontend/features/admin-settings/**` (generator `frontend-feature`, then edited)
- Modify: `libs/frontend/features/admin-settings/src/lib/admin-settings.routes.ts`
- Create: `libs/frontend/features/admin-settings/src/lib/admin-settings.service.ts`
- Create: `libs/frontend/features/admin-settings/src/lib/admin-settings-page.ts`
- Modify: `apps/frontend/src/app/app.routes.ts`
- Modify: `apps/frontend/src/app/app.config.ts`
- Test: `libs/frontend/features/admin-settings/src/lib/admin-settings-page.spec.ts`
- Test: `libs/frontend/features/admin-settings/src/lib/admin-settings.service.spec.ts`

**Interfaces:**
- Consumes: `API_BASE_URL` from `@org/frontend-core`, `AppSettings` shape (mirror the backend `AppSettings` — define a local `AdminSettings` interface in the service; do **not** import from a backend lib).
- Produces: `ADMIN_SETTINGS_ROUTES`, `AdminSettingsService.load()` / `.save(patch)`, `AdminSettingsPage`.

- [ ] **Step 1: Scaffold**

INVOKE `nx-generate`. Then:

```bash
npx nx g @org/starter-plugin:frontend-feature admin-settings --roles=admin --icon=settings
```

Expected: `libs/frontend/features/admin-settings` with a routes file, a signals store, a page, a service, wired via `loadChildren`. It also adds a `DASHBOARD_NAV` entry — **remove that**: this feature lives under the existing "Admin" tab, not as its own sidenav item. Delete the generated nav wiring and any list/detail pages that don't apply; keep a single page.

- [ ] **Step 2: Write the failing service test — `admin-settings.service.spec.ts`**

```ts
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@org/frontend-core';
import { AdminSettingsService } from './admin-settings.service';

describe('AdminSettingsService', () => {
  let service: AdminSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AdminSettingsService,
        { provide: API_BASE_URL, useValue: 'http://api.test' },
      ],
    });
    service = TestBed.inject(AdminSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  it('GETs /admin/settings', () => {
    service.load().subscribe();
    const req = http.expectOne('http://api.test/admin/settings');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ accountRetention: { inactiveDays: null, warningDays: null } });
  });

  it('PATCHes /admin/settings with the given patch', () => {
    service.save({ accountRetention: { inactiveDays: 180, warningDays: 14 } }).subscribe();
    const req = http.expectOne('http://api.test/admin/settings');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ accountRetention: { inactiveDays: 180, warningDays: 14 } });
    req.flush({ accountRetention: { inactiveDays: 180, warningDays: 14 } });
  });
});
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npx nx test frontend-features-admin-settings`
Expected: FAIL — service not implemented.

- [ ] **Step 4: Write `admin-settings.service.ts`**

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import { Observable } from 'rxjs';

export interface AdminSettings {
  accountRetention: {
    inactiveDays: number | null;
    warningDays: number | null;
  };
}
export type AdminSettingsPatch = {
  accountRetention?: Partial<AdminSettings['accountRetention']>;
};

@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/admin/settings`;

  load(): Observable<AdminSettings> {
    return this.http.get<AdminSettings>(this.base, { withCredentials: true });
  }

  save(patch: AdminSettingsPatch): Observable<AdminSettings> {
    return this.http.patch<AdminSettings>(this.base, patch, {
      withCredentials: true,
    });
  }
}
```

- [ ] **Step 5: Write the failing page test — `admin-settings-page.spec.ts`**

```ts
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@org/frontend-core';
import { AdminSettingsPage } from './admin-settings-page';

describe('AdminSettingsPage', () => {
  let fixture: ComponentFixture<AdminSettingsPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSettingsPage, HttpClientTestingModule],
      providers: [{ provide: API_BASE_URL, useValue: 'http://api.test' }],
    }).compileComponents();
    fixture = TestBed.createComponent(AdminSettingsPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('http://api.test/admin/settings').flush({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
    fixture.detectChanges();
  });

  it('loads current values into the form', () => {
    const cmp = fixture.componentInstance as unknown as {
      form: { value: { inactiveDays: number | null; warningDays: number | null } };
    };
    expect(cmp.form.value.inactiveDays).toBe(180);
    expect(cmp.form.value.warningDays).toBe(14);
  });

  it('sends null for a cleared retention field', () => {
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue: (v: unknown) => void };
      submit: () => void;
    };
    cmp.form.patchValue({ inactiveDays: null, warningDays: null });
    cmp.submit();
    const req = http.expectOne('http://api.test/admin/settings');
    expect(req.request.body).toEqual({
      accountRetention: { inactiveDays: null, warningDays: null },
    });
    req.flush({ accountRetention: { inactiveDays: null, warningDays: null } });
  });

  it('blocks submit when warningDays >= inactiveDays', () => {
    const cmp = fixture.componentInstance as unknown as {
      form: { patchValue: (v: unknown) => void; invalid: boolean };
      submit: () => void;
    };
    cmp.form.patchValue({ inactiveDays: 10, warningDays: 10 });
    cmp.submit();
    http.expectNone('http://api.test/admin/settings');
    expect(cmp.form.invalid).toBe(true);
  });
});
```

- [ ] **Step 6: Run it — verify it fails**

Run: `npx nx test frontend-features-admin-settings`
Expected: FAIL — page not implemented.

- [ ] **Step 7: Write `admin-settings-page.ts`**

Reactive form, OnPush, zoneless-safe. Use `@org/frontend-ui` / `@org/frontend-feedback` for Material (form field, input, button, snackbar). Structure:
- `form = new FormGroup({ inactiveDays: new FormControl<number | null>(null), warningDays: new FormControl<number | null>(null) })` with a group-level validator: if both non-null and `warningDays >= inactiveDays` → `{ warningTooLarge: true }`; each control `Validators.min(1)` + integer check.
- `ngOnInit` / a `constructor` effect: `this.service.load().subscribe(s => this.form.setValue({ inactiveDays: s.accountRetention.inactiveDays, warningDays: s.accountRetention.warningDays }))`.
- `submit()`: if `form.invalid` return; build patch `{ accountRetention: { inactiveDays: v.inactiveDays ?? null, warningDays: v.warningDays ?? null } }`; `service.save(patch).subscribe({ next: → success snackbar, error: err => map `INVALID_SETTINGS` onto a form error })`.
- Template: a short intro paragraph, the two number inputs with hints ("Leave blank to never auto-delete inactive accounts." / "Leave blank to delete without a warning email."), a submit button, disabled while saving. Follow the `.panel` / page-toolbar aesthetic from the dashboard redesign (see other admin pages).
- `title: 'Settings'` on the route.

- [ ] **Step 8: Set `admin-settings.routes.ts`**

```ts
import { Route } from '@angular/router';
import { AdminSettingsPage } from './admin-settings-page';

/** Mounted at `/app/admin/settings`; the parent keeps `roleGuard('admin')`. */
export const ADMIN_SETTINGS_ROUTES: Route[] = [
  { path: '', component: AdminSettingsPage, title: 'Settings' },
];
```

Export `ADMIN_SETTINGS_ROUTES` from the lib `index.ts`.

- [ ] **Step 9: Wire the route — `apps/frontend/src/app/app.routes.ts`**

Add as the last child of the `admin` route:

```ts
          {
            path: 'settings',
            loadChildren: () =>
              import('@org/frontend-features-admin-settings').then(
                (m) => m.ADMIN_SETTINGS_ROUTES,
              ),
          },
```

- [ ] **Step 10: Register the tab — `apps/frontend/src/app/app.config.ts`**

```ts
    provideAdminTab({ label: 'Settings', labelKey: 'dashboard.adminTabs.settings', path: 'settings', order: 30 }),
```

Add the `dashboard.adminTabs.settings` key to the i18n files that hold the sibling keys (`dashboard.adminTabs.users` etc.) — grep for `adminTabs.audit` to find them; add `en` and `fr` values ("Settings" / "Paramètres").

- [ ] **Step 11: `nx sync` + full frontend check**

```bash
npm install && npx nx sync
npx nx run-many -t test lint --projects=frontend-features-admin-settings,frontend
npx nx build frontend
```
Expected: PASS; build succeeds; the new lazy chunk appears.

- [ ] **Step 12: Commit**

```bash
git add libs/frontend/features/admin-settings apps/frontend libs/frontend/i18n tsconfig.json apps/frontend/tsconfig.app.json
git commit -m "feat(admin-settings): admin console tab for account-retention config

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 10: Public settings service + dynamic legal pages

**Files:**
- First: commit the pending manual legal-notice/cookie wording fixes (already in the working tree).
- Create: `libs/frontend/core/src/lib/public-settings.ts`
- Modify: `libs/frontend/core/src/index.ts`
- Modify: `libs/frontend/consent/src/lib/legal/privacy-policy.page.ts`
- Test: `libs/frontend/core/src/lib/public-settings.spec.ts`
- Test: `libs/frontend/consent/src/lib/legal/privacy-policy.page.spec.ts` (new or extend)

**Interfaces:**
- Consumes: `API_BASE_URL`, `PublicAppSettings` from `@org/shared-contracts` (Task 2).
- Produces: `PublicSettingsService.get(): Observable<PublicAppSettings>`; `RETENTION_FALLBACK: PublicAppSettings` (the safe `{ inactiveDays: null, warningDays: null }` default).

- [ ] **Step 1: Commit the pending legal wording fixes**

These edits are already in the working tree (SIRET / TVA / address / cookie retention values). They are unrelated to the retention feature — commit them on their own:

```bash
git add libs/frontend/consent/src/lib/legal/legal-notice.page.ts libs/frontend/consent/src/lib/legal/cookie-policy.page.ts GETTING_STARTED.md
git commit -m "docs(legal): fill in publisher identifiers and cookie retention values

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

(Leave `privacy-policy.page.ts` — it changes again in this task.)

- [ ] **Step 2: Write the failing service test — `public-settings.spec.ts`**

```ts
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api-base-url';
import { PublicSettingsService } from './public-settings';

describe('PublicSettingsService', () => {
  let service: PublicSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PublicSettingsService,
        { provide: API_BASE_URL, useValue: 'http://api.test' },
      ],
    });
    service = TestBed.inject(PublicSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  it('GETs /public/settings without credentials', () => {
    service.get().subscribe();
    const req = http.expectOne('http://api.test/public/settings');
    expect(req.request.method).toBe('GET');
    req.flush({ accountRetention: { inactiveDays: 90, warningDays: 7 } });
  });

  it('emits the safe fallback when the request errors', (done) => {
    service.get().subscribe((v) => {
      expect(v).toEqual({ accountRetention: { inactiveDays: null, warningDays: null } });
      done();
    });
    http.expectOne('http://api.test/public/settings').error(new ProgressEvent('fail'));
  });
});
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npx nx test frontend-core`
Expected: FAIL.

- [ ] **Step 4: Write `public-settings.ts`**

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { PublicAppSettings } from '@org/shared-contracts';
import { Observable, catchError, of } from 'rxjs';
import { API_BASE_URL } from './api-base-url';

/** The safe default used before the request resolves and if it fails — a
 * privacy page must never claim a retention period that isn't configured. */
export const RETENTION_FALLBACK: PublicAppSettings = {
  accountRetention: { inactiveDays: null, warningDays: null },
};

/** Reads the unauthenticated `GET /api/public/settings`. Used by the
 * legal pages to state the real data-retention period. */
@Injectable({ providedIn: 'root' })
export class PublicSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(API_BASE_URL)}/public/settings`;

  get(): Observable<PublicAppSettings> {
    return this.http
      .get<PublicAppSettings>(this.url)
      .pipe(catchError(() => of(RETENTION_FALLBACK)));
  }
}
```

Export from `libs/frontend/core/src/index.ts`:

```ts
export { PublicSettingsService, RETENTION_FALLBACK } from './lib/public-settings';
```

- [ ] **Step 5: Write the failing privacy-page test — `privacy-policy.page.spec.ts`**

```ts
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '@org/frontend-core';
import { PrivacyPolicy } from './privacy-policy.page';

function setup() {
  TestBed.configureTestingModule({
    imports: [PrivacyPolicy, HttpClientTestingModule],
    providers: [provideRouter([]), { provide: API_BASE_URL, useValue: 'http://api.test' }],
  });
  const fixture: ComponentFixture<PrivacyPolicy> = TestBed.createComponent(PrivacyPolicy);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, http };
}

describe('PrivacyPolicy retention section', () => {
  it('shows the "not auto-deleted" wording when inactiveDays is null', () => {
    const { fixture, http } = setup();
    http.expectOne('http://api.test/public/settings').flush({
      accountRetention: { inactiveDays: null, warningDays: null },
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/do not automatically delete inactive accounts/i);
  });

  it('shows the concrete period and warning when configured', () => {
    const { fixture, http } = setup();
    http.expectOne('http://api.test/public/settings').flush({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('180 days');
    expect(text).toContain('14 days');
  });

  it('falls back to the "not auto-deleted" wording if the request fails', () => {
    const { fixture, http } = setup();
    http.expectOne('http://api.test/public/settings').error(new ProgressEvent('fail'));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toMatch(/do not automatically delete inactive accounts/i);
  });
});
```

- [ ] **Step 6: Run it — verify it fails**

Run: `npx nx test frontend-consent`
Expected: FAIL — no retention section / no service call.

- [ ] **Step 7: Update `privacy-policy.page.ts`**

- Inject `PublicSettingsService`; expose a signal:
  ```ts
  private readonly settings = inject(PublicSettingsService);
  protected readonly retention = toSignal(this.settings.get(), {
    initialValue: RETENTION_FALLBACK,
  });
  ```
  (`toSignal` from `@angular/core/rxjs-interop`.)
- Add a new `<h2>Account retention</h2>` section using `@if`:
  ```html
  @if (retention().accountRetention.inactiveDays; as days) {
    <p>
      Inactive accounts are permanently deleted after <strong>{{ days }} days</strong>
      of inactivity.
      @if (retention().accountRetention.warningDays; as warn) {
        We email you <strong>{{ warn }} days</strong> beforehand so you can keep
        the account by signing in.
      }
    </p>
  } @else {
    <p>
      We keep your account for as long as it exists. We
      <strong>do not automatically delete inactive accounts</strong>. You can
      delete your account at any time from your profile.
    </p>
  }
  ```
- Replace the `[N months]` placeholder in the existing "Retention" list item for account data with the same conditional (a short inline version, or a shared getter method `accountRetentionText()`).
- Keep `changeDetection: OnPush`. Add `HttpClient` provider assumption is fine — it's global in the app; the spec provides `HttpClientTestingModule`.

- [ ] **Step 8: Run tests + lint — verify pass**

Run: `npx nx run-many -t test lint --projects=frontend-core,frontend-consent`
Expected: PASS.

- [ ] **Step 9: `nx sync` + frontend build + affected e2e check**

```bash
npx nx sync
npx nx build frontend
npx nx affected -t e2e --dry-run   # confirm whether consent e2e is affected; run it only if so and quick
```

- [ ] **Step 10: Commit**

```bash
git add libs/frontend/core libs/frontend/consent tsconfig.json
git commit -m "feat(consent): privacy notice states the configured retention period

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

---

## Task 11: End-to-end verification + GETTING_STARTED

**Files:**
- Modify: `GETTING_STARTED.md`
- Modify: `libs/backend/features/account-retention/src/lib/account-retention.e2e.spec.ts` (new)

- [ ] **Step 1: Backend e2e for the sweep — `account-retention.e2e.spec.ts`**

Bootstrap the app with `mongodb-memory-server` (copy the harness from `user.e2e.spec.ts`). Scenario:
- Register two users; promote none. Set one user's `lastActiveAt` far in the past directly via the model, leave the other recent.
- `PATCH /api/admin/settings` (as a seeded admin) `{ accountRetention: { inactiveDays: 30, warningDays: 7 } }`.
- `POST /api/admin/account-retention/run` → expect `{ warned: 1, deleted: 0 }` (the stale user gets warned).
- Advance the stale user's `retentionWarnedAt` to 8 days ago via the model; `POST .../run` again → `{ warned: 0, deleted: 1 }`.
- `GET /api/users/<staleId>` → 404; the recent user still exists.
- Assert an audit row with action `account.purged` exists.

- [ ] **Step 2: Run the whole affected graph**

Run:
```bash
npx nx run-many -t lint test --projects=tag:scope:backend,tag:scope:frontend
npx nx run-many -t build --projects=backend,frontend
npx nx sync:check
```
Adjust project selectors to whatever the repo uses (`npx nx show projects` to list). Everything green.

- [ ] **Step 3: Update `GETTING_STARTED.md`**

Add a short "Inactive-account retention" subsection: it is opt-in from the admin console (Settings tab); default is never-delete; the privacy notice updates automatically; ops knobs are `ACCOUNT_RETENTION_CRON` / `ACCOUNT_RETENTION_BATCH_LIMIT`.

- [ ] **Step 4: Commit**

```bash
git add GETTING_STARTED.md libs/backend/features/account-retention
git commit -m "test(account-retention): end-to-end sweep coverage + docs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7"
```

- [ ] **Step 5: Open the PR**

```bash
git push -u origin feat/inactive-account-retention
gh pr create --fill --base main
```

PR body ends with:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01PxCaYLfGPKyN4cauKpuGt7
```

---

## Self-Review

**Spec coverage:**
- Runtime settings store + admin UI → Tasks 1, 2, 9.
- `lastActiveAt` (login + refresh), throttled → Tasks 3, 4, 5.
- Reference date `lastActiveAt ?? createdAt` → Task 7 (`findRetentionCandidates` `$ifNull`).
- Exclude `admin` + `disabledAt` → Task 7 query.
- Daily cron, env-overridable → Tasks 5, 7, 8.
- Warn phase, `warningDays` null ⇒ skip → Task 7.
- Delete guard `retentionWarnedAt <= now - warningDays` → Task 7 (`warnedBefore`).
- Hard delete reusing the delete path + `user.deleted` event → Task 3, 7.
- Audit `SETTINGS_CHANGED` / `ACCOUNT_PURGED` → Task 2.
- Warning email, localised → Task 6.
- Public endpoint whitelisted → Task 2.
- Privacy page two variants + fallback → Task 10.
- Retention value in the existing "Retention" list → Task 10 step 7.
- Env vars + `.env.example` + READMEs → Task 8.
- `@nestjs/schedule` dep + lockfile multi-pass → Task 5, 8.
- `nx sync` after wiring → Tasks 2, 5, 9, 10.
- Tests enumerated in the spec → Tasks 1–10 each carry their slice; e2e → Task 11.

**Placeholder scan:** Task 7 leaves one deliberate, bounded open choice (the frontend URL source) with an explicit instruction not to invent an env var — acceptable, not a placeholder. No "TBD"/"add error handling"/"write tests for the above" without code.

**Type consistency:** `AppSettings` shape identical across Tasks 1, 2, 9 (frontend mirrors as `AdminSettings`). `findRetentionCandidates` signature identical in Tasks 7 (repo, service, job test). `emitDeleted` payload (`userId`, `email`, `reason`) identical in Tasks 2, 3, 7. `recordActivity(userId)` identical in Tasks 3, 5. `run(now?)` return `{ warned, deleted }` identical in Tasks 7, 11.

**Known adaptation points** (flagged inline for the implementer): exact logger token/class from `@org/backend-core`; whether `AppConfigModule` needs importing in the retention module; the auth service's private events field name; the i18n file locations for `adminTabs.settings`.
