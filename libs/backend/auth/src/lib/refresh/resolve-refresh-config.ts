import type { AppConfigService } from '@org/backend-core';
import { parseDurationMs } from './parse-duration';

const DEFAULT_REFRESH_EXPIRES_IN = '30d';

/**
 * `REFRESH_EXPIRES_IN` is optional at the global config level (auth may not
 * be installed), so the default is applied here, at the point the refresh
 * brick is actually used. Returns the lifetime in milliseconds so callers
 * can compute an absolute `expiresAt`.
 */
export function resolveRefreshTtlMs(config: AppConfigService): number {
  return parseDurationMs(
    config.session.refreshExpiresIn ?? DEFAULT_REFRESH_EXPIRES_IN,
  );
}
