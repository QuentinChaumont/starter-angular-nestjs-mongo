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
