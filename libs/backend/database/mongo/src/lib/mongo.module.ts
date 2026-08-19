import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule, AppConfigService } from '@org/backend-core';
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
    MongooseModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: resolveMongoUri(config),
      }),
    }),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
