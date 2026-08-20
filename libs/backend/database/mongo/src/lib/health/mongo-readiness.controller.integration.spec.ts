import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppConfigService, EnvironmentVariables } from '@org/backend-core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoModule } from '../mongo.module';

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

describe('MongoReadinessController (integration, real Mongo instance)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    const moduleRef = await Test.createTestingModule({
      imports: [MongoModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(buildConfig({ MONGO_URI: mongod.getUri() }))
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('GET /health/ready returns 200 when Mongo is connected', async () => {
    const response = await fetch(`${baseUrl}/health/ready`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.info.mongo).toEqual({ status: 'up' });
  }, 30_000);
});
