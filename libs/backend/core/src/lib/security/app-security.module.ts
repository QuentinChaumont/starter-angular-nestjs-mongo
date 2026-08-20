import { Global, Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';

/**
 * Provides `ThrottlerGuard` for global rate limiting. The guard is exported
 * rather than bound via `APP_GUARD`, so `main.ts` applies it explicitly
 * alongside the other cross-cutting concerns (`app.useGlobalGuards(...)`),
 * matching how `GlobalExceptionFilter` is wired.
 */
@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            ttl: seconds(config.security.rateLimit.ttlSeconds),
            limit: config.security.rateLimit.limit,
          },
        ],
      }),
    }),
  ],
  providers: [ThrottlerGuard],
  exports: [ThrottlerGuard],
})
export class AppSecurityModule {}
