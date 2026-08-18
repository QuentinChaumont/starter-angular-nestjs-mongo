/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  AppConfigService,
  AppLogger,
  useRequestIdMiddleware,
} from '@org/backend-core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(AppLogger);
  logger.setContext('Bootstrap');
  app.useLogger(logger);
  useRequestIdMiddleware(app);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const config = app.get(AppConfigService);
  const port = config.app.port;

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
