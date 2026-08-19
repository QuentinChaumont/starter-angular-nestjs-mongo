import type { AppConfigService } from '@org/backend-core';

const MONGO_URI_PATTERN = /^mongodb(\+srv)?:\/\//;

/**
 * MONGO_URI is optional at the global config level (Mongo may not be used
 * at all), so it is only validated here, at the point Mongo is actually
 * enabled by importing MongoModule.
 */
export function resolveMongoUri(config: AppConfigService): string {
  const { uri } = config.mongo;

  if (!uri) {
    throw new Error(
      'MONGO_URI must be set when MongoModule is enabled. Configure it in the environment.',
    );
  }

  if (!MONGO_URI_PATTERN.test(uri)) {
    throw new Error(
      `MONGO_URI must start with "mongodb://" or "mongodb+srv://", received "${uri}".`,
    );
  }

  return uri;
}
