import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../lib/config/app-config.service';
import { EnvironmentVariables } from '../lib/config/environment-variables';

const DEFAULT_TEST_ENV: EnvironmentVariables = {
  NODE_ENV: 'development',
  PORT: 3000,
  CORS_ORIGINS: ['http://localhost:4200'],
  RATE_LIMIT_TTL_SECONDS: 60,
  RATE_LIMIT_LIMIT: 100,
};

/**
 * Internal to backend-core's own specs — deliberately not exported from
 * `src/index.ts`. The public equivalent (`@org/backend-testing`'s
 * `buildTestConfig`) can't be used here: that lib depends on backend-core,
 * so backend-core depending back on it would be circular.
 */
export function buildTestConfig(
  overrides: Partial<EnvironmentVariables> = {},
): AppConfigService {
  return new AppConfigService(
    new ConfigService<EnvironmentVariables, true>({
      ...DEFAULT_TEST_ENV,
      ...overrides,
    }),
  );
}
