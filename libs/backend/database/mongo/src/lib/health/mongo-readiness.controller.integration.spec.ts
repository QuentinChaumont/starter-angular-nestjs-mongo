import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '@org/backend-core';
import { listenOnRandomPort, startTestMongo, TestMongo } from '@org/backend-testing';
import { MongoModule } from '../mongo.module';

describe('MongoReadinessController (integration, real Mongo instance)', () => {
  let testMongo: TestMongo;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    testMongo = await startTestMongo();

    const moduleRef = await Test.createTestingModule({
      imports: [MongoModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(testMongo.config)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    baseUrl = await listenOnRandomPort(app);
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await testMongo.mongod.stop();
  });

  it('GET /health/ready returns 200 when Mongo is connected', async () => {
    const response = await fetch(`${baseUrl}/health/ready`);

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.info.mongo).toEqual({ status: 'up' });
  }, 30_000);
});
