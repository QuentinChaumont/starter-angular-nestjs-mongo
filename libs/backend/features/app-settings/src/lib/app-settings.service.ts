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
