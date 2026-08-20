import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppConfigService } from '../config/app-config.service';
import { EnvironmentVariables } from '../config/environment-variables';
import { setupSecurity } from './setup-security';

@Controller('probe')
class ProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true };
  }
}

function buildConfig(corsOrigins: string[]): AppConfigService {
  return new AppConfigService(
    new ConfigService<EnvironmentVariables, true>({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: corsOrigins,
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    }),
  );
}

async function createProbeApp(
  corsOrigins: string[],
): Promise<{ app: INestApplication; baseUrl: string }> {
  @Module({
    controllers: [ProbeController],
    providers: [{ provide: AppConfigService, useValue: buildConfig(corsOrigins) }],
  })
  class ProbeModule {}

  const app = await NestFactory.create(ProbeModule, { logger: false });
  setupSecurity(app);
  await app.listen(0);

  const address = app.getHttpServer().address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return { app, baseUrl: `http://127.0.0.1:${port}` };
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
