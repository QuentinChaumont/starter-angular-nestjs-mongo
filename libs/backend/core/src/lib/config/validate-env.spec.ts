import { validateEnv } from './validate-env';

describe('validateEnv', () => {
  it('applies default values when nothing is provided', () => {
    const result = validateEnv({});

    expect(result).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_LIMIT: 100,
    });
  });

  it('parses provided values', () => {
    const result = validateEnv({
      NODE_ENV: 'production',
      PORT: '4000',
      CORS_ORIGINS: 'https://example.com, https://admin.example.com',
      RATE_LIMIT_TTL_SECONDS: '30',
      RATE_LIMIT_LIMIT: '10',
    });

    expect(result).toEqual({
      NODE_ENV: 'production',
      PORT: 4000,
      CORS_ORIGINS: ['https://example.com', 'https://admin.example.com'],
      RATE_LIMIT_TTL_SECONDS: 30,
      RATE_LIMIT_LIMIT: 10,
    });
  });

  it('throws a readable error for a non-numeric RATE_LIMIT_TTL_SECONDS', () => {
    expect(() => validateEnv({ RATE_LIMIT_TTL_SECONDS: 'abc' })).toThrow(
      /RATE_LIMIT_TTL_SECONDS must be a positive integer/,
    );
  });

  it('throws a readable error for a non-positive RATE_LIMIT_LIMIT', () => {
    expect(() => validateEnv({ RATE_LIMIT_LIMIT: '0' })).toThrow(
      /RATE_LIMIT_LIMIT must be a positive integer/,
    );
  });

  it('throws a readable error for an invalid NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV must be one of development, test, production/,
    );
  });

  it('throws a readable error for a non-numeric PORT', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(/PORT must be an integer/);
  });

  it('throws a readable error for an out-of-range PORT', () => {
    expect(() => validateEnv({ PORT: '70000' })).toThrow(/PORT must be an integer/);
  });

  it('accumulates multiple errors in a single message', () => {
    expect(() => validateEnv({ NODE_ENV: 'bogus', PORT: 'bogus' })).toThrow(
      /NODE_ENV must be one of[\s\S]*PORT must be an integer/,
    );
  });

  it('does not require MONGO_URI, JWT_SECRET or JWT_EXPIRES_IN', () => {
    const result = validateEnv({});

    expect(result.MONGO_URI).toBeUndefined();
    expect(result.JWT_SECRET).toBeUndefined();
    expect(result.JWT_EXPIRES_IN).toBeUndefined();
  });

  it('does not require REFRESH_EXPIRES_IN or AUTH_COOKIE_SECURE', () => {
    const result = validateEnv({});

    expect(result.REFRESH_EXPIRES_IN).toBeUndefined();
    expect(result.AUTH_COOKIE_SECURE).toBeUndefined();
  });

  it('parses AUTH_COOKIE_SECURE as a boolean and passes REFRESH_EXPIRES_IN through', () => {
    expect(validateEnv({ AUTH_COOKIE_SECURE: 'false' }).AUTH_COOKIE_SECURE).toBe(
      false,
    );
    expect(validateEnv({ AUTH_COOKIE_SECURE: 'true' }).AUTH_COOKIE_SECURE).toBe(
      true,
    );
    expect(validateEnv({ REFRESH_EXPIRES_IN: '7d' }).REFRESH_EXPIRES_IN).toBe(
      '7d',
    );
  });

  it('throws a readable error for a non-boolean AUTH_COOKIE_SECURE', () => {
    expect(() => validateEnv({ AUTH_COOKIE_SECURE: 'maybe' })).toThrow(
      /AUTH_COOKIE_SECURE must be a boolean/,
    );
  });

  it('leaves every OIDC_* variable optional', () => {
    const result = validateEnv({});

    expect(result.OIDC_ISSUER).toBeUndefined();
    expect(result.OIDC_CLIENT_ID).toBeUndefined();
    expect(result.OIDC_REQUIRE_VERIFIED_EMAIL).toBeUndefined();
  });

  it('passes OIDC_* variables through', () => {
    const result = validateEnv({
      OIDC_ISSUER: 'https://idp.example',
      OIDC_CLIENT_ID: 'client-1',
      OIDC_REDIRECT_URI: 'https://api.example/api/auth/oidc/callback',
      OIDC_REQUIRE_VERIFIED_EMAIL: 'false',
    });

    expect(result.OIDC_ISSUER).toBe('https://idp.example');
    expect(result.OIDC_CLIENT_ID).toBe('client-1');
    expect(result.OIDC_REDIRECT_URI).toBe(
      'https://api.example/api/auth/oidc/callback',
    );
    expect(result.OIDC_REQUIRE_VERIFIED_EMAIL).toBe(false);
  });

  it('passes through optional variables when present', () => {
    const result = validateEnv({
      MONGO_URI: 'mongodb://localhost:27017/app',
      JWT_SECRET: 'secret',
      JWT_EXPIRES_IN: '1h',
    });

    expect(result.MONGO_URI).toBe('mongodb://localhost:27017/app');
    expect(result.JWT_SECRET).toBe('secret');
    expect(result.JWT_EXPIRES_IN).toBe('1h');
  });

  it('rejects an empty optional variable', () => {
    expect(() => validateEnv({ MONGO_URI: '' })).not.toThrow();
    expect(() => validateEnv({ MONGO_URI: '   ' })).toThrow(
      /MONGO_URI must not be empty when provided/,
    );
  });
});
