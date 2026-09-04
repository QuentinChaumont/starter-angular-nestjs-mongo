import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLogger } from './app-logger.service';
import { HttpLoggerInterceptor } from './http-logger.interceptor';
import { RequestContextService } from './request-context.service';
import { RequestIdMiddleware } from './request-id.middleware';
import { StartupSummaryService } from './startup-summary.service';

@Global()
@Module({
  providers: [
    RequestContextService,
    AppLogger,
    RequestIdMiddleware,
    StartupSummaryService,
    { provide: APP_INTERCEPTOR, useClass: HttpLoggerInterceptor },
  ],
  exports: [RequestContextService, AppLogger, RequestIdMiddleware],
})
export class LoggerModule {}
