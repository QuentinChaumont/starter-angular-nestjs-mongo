import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '../config/app-config.service';
import { buildTestConfig } from '../../testing/build-test-config';
import { listenOnRandomPort } from '../../testing/listen-on-random-port';
import { setupSecurity } from './setup-security';

@Controller('probe')
class ProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true };
  }
}

@Controller('api/probe')
class ApiProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true };
  }
}

async function createProbeApp(
  corsOrigins: string[],
): Promise<{ app: INestApplication; baseUrl: string }> {
  @Module({
    controllers: [ProbeController, ApiProbeController],
    providers: [
      {
        provide: AppConfigService,
        useValue: buildTestConfig({ CORS_ORIGINS: corsOrigins }),
      },
    ],
  })
  class ProbeModule {}

  const app = await NestFactory.create(ProbeModule, { logger: false });
  setupSecurity(app);
  const baseUrl = await listenOnRandomPort(app);

  return { app, baseUrl };
}

describe('setupSecurity (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    ({ app, baseUrl } = await createProbeApp(['https://allowed.example.com']));
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets Helmet security headers and hides X-Powered-By', async () => {
    const response = await fetch(`${baseUrl}/probe`);

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-dns-prefetch-control')).toBe('off');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });

  it('marks API responses no-store, but not other routes', async () => {
    const api = await fetch(`${baseUrl}/api/probe`);
    expect(api.headers.get('cache-control')).toBe('no-store');

    const other = await fetch(`${baseUrl}/probe`);
    expect(other.headers.get('cache-control')).not.toBe('no-store');
  });

  it('reflects an allowed CORS origin', async () => {
    const response = await fetch(`${baseUrl}/probe`, {
      headers: { origin: 'https://allowed.example.com' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://allowed.example.com',
    );
  });

  it('does not reflect a disallowed CORS origin', async () => {
    const response = await fetch(`${baseUrl}/probe`, {
      headers: { origin: 'https://not-allowed.example.com' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
