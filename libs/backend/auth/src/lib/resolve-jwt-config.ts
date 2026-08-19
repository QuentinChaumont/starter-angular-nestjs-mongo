import type { AppConfigService } from '@org/backend-core';

export interface ResolvedJwtConfig {
  secret: string;
  expiresIn: string;
}

const DEFAULT_EXPIRES_IN = '15m';

/**
 * JWT_SECRET is optional at the global config level (auth may not be used
 * at all), so it is only validated here, at the point auth is actually
 * enabled by importing AuthModule.
 */
export function resolveJwtConfig(config: AppConfigService): ResolvedJwtConfig {
  const { secret, expiresIn } = config.jwt;

  if (!secret) {
    throw new Error(
      'JWT_SECRET must be set when AuthModule is enabled. Configure it in the environment.',
    );
  }

  return { secret, expiresIn: expiresIn ?? DEFAULT_EXPIRES_IN };
}
