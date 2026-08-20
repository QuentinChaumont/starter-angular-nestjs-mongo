import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { EnvironmentVariables } from '../config/environment-variables';
import { AppSecurityModule } from './app-security.module';

@Controller('probe')
class ProbeController {
  @Get()
  probe(): { ok: true } {
    return { ok: true };
  }
}

@Module({
  imports: [AppSecurityModule],
  controllers: [ProbeController],
})
class ProbeModule {}

function buildConfig(): AppConfigService {
  return new AppConfigService(
    new ConfigService<EnvironmentVariables, true>({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 2,
    }),
  );
}

/**
 * AppSecurityModule imports the real AppConfigModule, whose ConfigModule
 * .forRoot() runs synchronously as soon as the module is decorated (at
 * import time). `Test.createTestingModule(...).overrideProvider()` replaces
 * AppConfigService at DI-resolution time instead, which works regardless
 * of that timing.
 */
describe('AppSecurityModule rate limiting (integration)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(buildConfig())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards(app.get(ThrottlerGuard));
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows requests up to the configured limit, then responds 429', async () => {
    const first = await fetch(`${baseUrl}/probe`);
    const second = await fetch(`${baseUrl}/probe`);
    const third = await fetch(`${baseUrl}/probe`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
  });
});
