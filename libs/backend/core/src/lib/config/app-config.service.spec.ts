import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { EnvironmentVariables } from './environment-variables';

describe('AppConfigService', () => {
  function createService(env: EnvironmentVariables): AppConfigService {
    const configService = new ConfigService<EnvironmentVariables, true>(env);
    return new AppConfigService(configService);
  }

  it('exposes app.environment and app.port', () => {
    const service = createService({
      NODE_ENV: 'production',
      PORT: 4000,
      CORS_ORIGINS: ['https://example.com'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    });

    expect(service.app).toEqual({ environment: 'production', port: 4000 });
  });

  it('exposes http.corsOrigins', () => {
    const service = createService({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    });

    expect(service.http).toEqual({ corsOrigins: ['http://localhost:4200'] });
  });

  it('exposes security.rateLimit', () => {
    const service = createService({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 30,
      RATE_LIMIT_LIMIT: 10,
    });

    expect(service.security).toEqual({
      rateLimit: { ttlSeconds: 30, limit: 10 },
    });
  });

  it('exposes mongo.uri and jwt fields as undefined when not configured', () => {
    const service = createService({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    });

    expect(service.mongo).toEqual({ uri: undefined });
    expect(service.jwt).toEqual({ secret: undefined, expiresIn: undefined });
  });

  it('exposes mongo.uri and jwt fields when configured', () => {
    const service = createService({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
      MONGO_URI: 'mongodb://localhost:27017/app',
      JWT_SECRET: 'secret',
      JWT_EXPIRES_IN: '1h',
    });

    expect(service.mongo).toEqual({ uri: 'mongodb://localhost:27017/app' });
    expect(service.jwt).toEqual({ secret: 'secret', expiresIn: '1h' });
  });
});
