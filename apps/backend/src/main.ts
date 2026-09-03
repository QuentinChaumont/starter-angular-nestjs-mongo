import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  AppConfigService,
  AppLogger,
  GlobalExceptionFilter,
  createValidationPipe,
  setupOpenApi,
  setupSecurity,
  useRequestIdMiddleware,
} from '@org/backend-core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLogger);
  logger.setContext('Bootstrap');
  app.useLogger(logger);
  setupSecurity(app);
  app.useGlobalGuards(app.get(ThrottlerGuard));
  useRequestIdMiddleware(app);
  app.useGlobalFilters(app.get(GlobalExceptionFilter));
  app.useGlobalPipes(createValidationPipe());
  setupOpenApi(app);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const config = app.get(AppConfigService);
  const port = config.app.port;

  // On SIGTERM/SIGINT, Nest stops accepting connections, waits for in-flight
  // requests, runs `onModuleDestroy` hooks (Mongoose closes its connection),
  // then exits — no dropped requests on a container redeploy.
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap().catch((error) => {
  Logger.error(
    'Failed to start application',
    error instanceof Error ? error.stack : error,
  );
  process.exit(1);
});
