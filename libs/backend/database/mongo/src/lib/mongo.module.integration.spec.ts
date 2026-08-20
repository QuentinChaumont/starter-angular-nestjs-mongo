import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { AppConfigService, EnvironmentVariables } from '@org/backend-core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import { MongoModule } from './mongo.module';

function buildConfig(overrides: Partial<EnvironmentVariables> = {}) {
  return new AppConfigService(
    new ConfigService<EnvironmentVariables, true>({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
      ...overrides,
    }),
  );
}

/**
 * MongoModule imports the real AppConfigModule, whose ConfigModule.forRoot()
 * runs synchronously as soon as the module is decorated (at import time).
 * `Test.createTestingModule(...).overrideProvider()` replaces AppConfigService
 * at DI-resolution time instead, which works regardless of that timing.
 */
describe('MongoModule (integration, real Mongo instance)', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    // Honors MONGOMS_SYSTEM_BINARY / MONGOMS_DOWNLOAD_DIR if set in the
    // environment; otherwise mongodb-memory-server downloads its own
    // binary on first run.
    mongod = await MongoMemoryServer.create();
  }, 60_000);

  afterAll(async () => {
    await mongod.stop();
  });

  it('connects to Mongo using MONGO_URI from AppConfigService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MongoModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(buildConfig({ MONGO_URI: mongod.getUri() }))
      .compile();

    const connection = moduleRef.get<Connection>(getConnectionToken());
    expect(connection.readyState).toBe(1); // 1 = connected

    await moduleRef.close();
  }, 30_000);

  it('fails to boot with a readable error when MONGO_URI is missing', async () => {
    await expect(
      Test.createTestingModule({ imports: [MongoModule] })
        .overrideProvider(AppConfigService)
        .useValue(buildConfig())
        .compile(),
    ).rejects.toThrow(/MONGO_URI must be set/);
  });
});
