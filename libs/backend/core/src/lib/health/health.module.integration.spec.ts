import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HealthModule } from './health.module';

describe('HealthModule (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(HealthModule, { logger: false });
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
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
