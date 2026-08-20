import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { listenOnRandomPort } from '../../testing/listen-on-random-port';
import { HealthModule } from './health.module';

describe('HealthModule (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(HealthModule, { logger: false });
    baseUrl = await listenOnRandomPort(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns 200 with an ok status', async () => {
    const response = await fetch(`${baseUrl}/health/live`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', info: {}, error: {}, details: {} });
  });
});
