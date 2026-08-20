import { buildTestConfig } from './build-test-config';

describe('buildTestConfig', () => {
  it('applies sensible defaults with no overrides', () => {
    const config = buildTestConfig();

    expect(config.app).toEqual({ environment: 'development', port: 3000 });
    expect(config.http).toEqual({ corsOrigins: ['http://localhost:4200'] });
    expect(config.security).toEqual({
      rateLimit: { ttlSeconds: 60, limit: 100 },
    });
    expect(config.mongo).toEqual({ uri: undefined });
    expect(config.jwt).toEqual({ secret: undefined, expiresIn: undefined });
  });

  it('applies overrides on top of the defaults', () => {
    const config = buildTestConfig({
      MONGO_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
    });

    expect(config.mongo).toEqual({ uri: 'mongodb://localhost:27017/test' });
    expect(config.jwt).toEqual({ secret: 'test-secret', expiresIn: '1h' });
    expect(config.app.environment).toBe('development');
  });
});
