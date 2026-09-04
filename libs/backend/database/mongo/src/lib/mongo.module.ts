import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { AppConfigModule, AppConfigService } from '@org/backend-core';
import { MongoReadinessController } from './health/mongo-readiness.controller';
import { resolveMongoUri } from './resolve-mongo-uri';

/**
 * The Mongo connection only. It knows nothing about business entities —
 * features declare their own schemas via `MongooseModule.forFeature()` in
 * their own module, relying on this module being global to reach the
 * connection registered here.
 */
@Global()
@Module({
  imports: [
    AppConfigModule,
    TerminusModule,
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: resolveMongoUri(config),
        // Fail fast on an unreachable Mongo instead of hanging ~30 s.
        serverSelectionTimeoutMS: 5_000,
        // In production the app must not (re)build indexes on boot — do it
        // explicitly in a migration / `syncIndexes()` step. Dev keeps the
        // convenience.
        autoIndex: config.app.environment !== 'production',
      }),
    }),
  ],
  controllers: [MongoReadinessController],
  exports: [MongooseModule],
})
export class MongoModule {}
