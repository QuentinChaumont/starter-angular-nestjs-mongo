import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '@org/backend-core';
import { buildTestConfig, startTestMongo, TestMongo } from '@org/backend-testing';
import type { Connection } from 'mongoose';
import { MongoModule } from './mongo.module';

/**
 * MongoModule imports the real AppConfigModule, whose ConfigModule.forRoot()
 * runs synchronously as soon as the module is decorated (at import time).
 * `Test.createTestingModule(...).overrideProvider()` replaces AppConfigService
 * at DI-resolution time instead, which works regardless of that timing.
 */
describe('MongoModule (integration, real Mongo instance)', () => {
  let testMongo: TestMongo;

  beforeAll(async () => {
    testMongo = await startTestMongo();
  }, 60_000);

  afterAll(async () => {
    await testMongo.mongod.stop();
  });

  it('connects to Mongo using MONGO_URI from AppConfigService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MongoModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(testMongo.config)
      .compile();

    const connection = moduleRef.get<Connection>(getConnectionToken());
    expect(connection.readyState).toBe(1); // 1 = connected

    await moduleRef.close();
  }, 30_000);

  it('fails to boot with a readable error when MONGO_URI is missing', async () => {
    await expect(
      Test.createTestingModule({ imports: [MongoModule] })
        .overrideProvider(AppConfigService)
        .useValue(buildTestConfig())
        .compile(),
    ).rejects.toThrow(/MONGO_URI must be set/);
  });
});
