import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { listenOnRandomPort } from './listen-on-random-port';

@Controller('probe')
class ProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('listenOnRandomPort', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('starts the app on a free port and returns a reachable base URL', async () => {
    app = await NestFactory.create(ProbeModule, { logger: false });

    const baseUrl = await listenOnRandomPort(app);

    expect(baseUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const response = await fetch(`${baseUrl}/probe`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
