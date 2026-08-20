import { ConfigService } from '@nestjs/config';
import { AppConfigService, EnvironmentVariables } from '@org/backend-core';

const DEFAULT_TEST_ENV: EnvironmentVariables = {
  NODE_ENV: 'development',
  PORT: 3000,
  CORS_ORIGINS: ['http://localhost:4200'],
  RATE_LIMIT_TTL_SECONDS: 60,
  RATE_LIMIT_LIMIT: 100,
};

/**
 * Builds an `AppConfigService` directly from an in-memory `ConfigService`,
 * bypassing `AppConfigModule`'s `ConfigModule.forRoot()` (which validates
 * `process.env` synchronously at import time — too early for a test to
 * override per-case). Pass it via
 * `Test.createTestingModule(...).overrideProvider(AppConfigService).useValue(...)`
 * when the module under test imports `AppConfigModule` itself, or via a
 * provider array when it doesn't.
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
