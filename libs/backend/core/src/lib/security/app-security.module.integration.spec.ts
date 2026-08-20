import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { buildTestConfig } from '../../testing/build-test-config';
import { listenOnRandomPort } from '../../testing/listen-on-random-port';
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
      .useValue(buildTestConfig({ RATE_LIMIT_LIMIT: 2 }))
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards(app.get(ThrottlerGuard));
    await app.init();
    baseUrl = await listenOnRandomPort(app);
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
