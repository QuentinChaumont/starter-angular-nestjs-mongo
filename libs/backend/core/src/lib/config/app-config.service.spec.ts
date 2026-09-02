import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import {
  ENVIRONMENT_VARIABLE_NAMES,
  EnvironmentVariables,
} from './environment-variables';

describe('AppConfigService', () => {
  // `ConfigService.get()` falls back to `process.env`, into which Nx injects
  // the repo-root `.env`. Clear the app's variables so a local `.env` can't
  // make an "undefined when not configured" assertion fail.
  const savedEnv: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const name of ENVIRONMENT_VARIABLE_NAMES) {
      savedEnv[name] = process.env[name];
      delete process.env[name];
    }
  });
  afterEach(() => {
    for (const name of ENVIRONMENT_VARIABLE_NAMES) {
      if (savedEnv[name] === undefined) delete process.env[name];
      else process.env[name] = savedEnv[name];
    }
  });

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
      authRateLimit: { ttlSeconds: 60, limit: 10 },
    });
  });

  it('reads the stricter auth rate limit, defaulting to 10 / 60s', () => {
    const base = {
      NODE_ENV: 'development' as const,
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    };

    expect(createService(base).security.authRateLimit).toEqual({
      ttlSeconds: 60,
      limit: 10,
    });
    expect(
      createService({
        ...base,
        AUTH_RATE_LIMIT_TTL_SECONDS: 30,
        AUTH_RATE_LIMIT_LIMIT: 5,
      }).security.authRateLimit,
    ).toEqual({ ttlSeconds: 30, limit: 5 });
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

  it('exposes session fields as undefined when not configured', () => {
    const service = createService({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    });

    expect(service.session).toEqual({
      refreshExpiresIn: undefined,
      cookieSecure: undefined,
    });
  });

  it('exposes session fields when configured', () => {
    const service = createService({
      NODE_ENV: 'production',
      PORT: 3000,
      CORS_ORIGINS: ['https://example.com'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
      REFRESH_EXPIRES_IN: '7d',
      AUTH_COOKIE_SECURE: false,
    });

    expect(service.session).toEqual({
      refreshExpiresIn: '7d',
      cookieSecure: false,
    });
  });

  it('reports registration as enabled unless explicitly disabled', () => {
    const base = {
      NODE_ENV: 'development' as const,
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    };

    expect(createService(base).auth).toEqual({ registrationEnabled: true });
    expect(
      createService({ ...base, AUTH_REGISTRATION_ENABLED: true }).auth,
    ).toEqual({ registrationEnabled: true });
    expect(
      createService({ ...base, AUTH_REGISTRATION_ENABLED: false }).auth,
    ).toEqual({ registrationEnabled: false });
  });

  it('exposes mailer config with console-transport defaults', () => {
    const base = {
      NODE_ENV: 'development' as const,
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    };

    expect(createService(base).mailer).toEqual({
      smtpUrl: undefined,
      from: 'no-reply@localhost',
      previewDir: 'tmp/mail',
    });

    expect(
      createService({
        ...base,
        SMTP_URL: 'smtp://localhost:1025',
        MAIL_FROM: 'hello@example.test',
        MAIL_PREVIEW_DIR: 'tmp/outbox',
      }).mailer,
    ).toEqual({
      smtpUrl: 'smtp://localhost:1025',
      from: 'hello@example.test',
      previewDir: 'tmp/outbox',
    });
  });

  it('exposes oidc fields (undefined when unset)', () => {
    const bare = createService({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    });
    expect(bare.oidc.issuer).toBeUndefined();
    expect(bare.oidc.requireVerifiedEmail).toBeUndefined();

    const configured = createService({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
      OIDC_ISSUER: 'https://idp.example',
      OIDC_CLIENT_ID: 'client-1',
      OIDC_REDIRECT_URI: 'https://api.example/api/auth/oidc/callback',
    });
    expect(configured.oidc.issuer).toBe('https://idp.example');
    expect(configured.oidc.clientId).toBe('client-1');
  });
});
