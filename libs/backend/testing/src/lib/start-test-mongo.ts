import { AppConfigService, EnvironmentVariables } from '@org/backend-core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildTestConfig } from './build-test-config';

export interface TestMongo {
  mongod: MongoMemoryServer;
  config: AppConfigService;
}

/**
 * Starts an in-memory Mongo instance and pairs it with an `AppConfigService`
 * that already points `MONGO_URI` at it — the two are needed together at
 * nearly every real-Mongo integration test's `beforeAll`. Honors
 * `MONGOMS_SYSTEM_BINARY` / `MONGOMS_DOWNLOAD_DIR` if set in the
 * environment; otherwise `mongodb-memory-server` downloads its own binary
 * on first run, so callers should give this a generous `beforeAll` timeout
 * (60s is the convention used elsewhere in this workspace).
 */
export async function startTestMongo(
  overrides: Partial<EnvironmentVariables> = {},
): Promise<TestMongo> {
  const mongod = await MongoMemoryServer.create();
  const config = buildTestConfig({ MONGO_URI: mongod.getUri(), ...overrides });
  return { mongod, config };
}
