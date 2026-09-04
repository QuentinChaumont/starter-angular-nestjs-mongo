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

  it('accepts a valid LOG_LEVEL and rejects an invalid one', () => {
    expect(validateEnv({ LOG_LEVEL: 'warn' })).toMatchObject({
      LOG_LEVEL: 'warn',
    });
    expect(validateEnv({})).not.toHaveProperty('LOG_LEVEL');
    expect(() => validateEnv({ LOG_LEVEL: 'chatty' })).toThrow(
      /LOG_LEVEL must be one of/,
    );
  });

  it('keeps TRUST_PROXY as a raw string for setup-security to interpret', () => {
    expect(validateEnv({ TRUST_PROXY: '1' })).toMatchObject({
      TRUST_PROXY: '1',
    });
    expect(validateEnv({})).not.toHaveProperty('TRUST_PROXY');
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
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(
      /PORT must be an integer/,
    );
  });

  it('throws a readable error for an out-of-range PORT', () => {
    expect(() => validateEnv({ PORT: '70000' })).toThrow(
      /PORT must be an integer/,
    );
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
    expect(
      validateEnv({ AUTH_COOKIE_SECURE: 'false' }).AUTH_COOKIE_SECURE,
    ).toBe(false);
    expect(validateEnv({ AUTH_COOKIE_SECURE: 'true' }).AUTH_COOKIE_SECURE).toBe(
      true,
    );
    expect(validateEnv({ REFRESH_EXPIRES_IN: '7d' }).REFRESH_EXPIRES_IN).toBe(
      '7d',
    );
  });

  it('leaves AUTH_RATE_LIMIT_* / SEED_ADMIN_* unset by default and parses them when given', () => {
    const bare = validateEnv({});
    expect(bare.AUTH_RATE_LIMIT_LIMIT).toBeUndefined();
    expect(bare.SEED_ADMIN_EMAIL).toBeUndefined();

    const configured = validateEnv({
      AUTH_RATE_LIMIT_TTL_SECONDS: '30',
      AUTH_RATE_LIMIT_LIMIT: '5',
      SEED_ADMIN_EMAIL: 'admin@example.com',
      SEED_ADMIN_PASSWORD: 'Str0ng!Passw0rd',
    });
    expect(configured.AUTH_RATE_LIMIT_TTL_SECONDS).toBe(30);
    expect(configured.AUTH_RATE_LIMIT_LIMIT).toBe(5);
    expect(configured.SEED_ADMIN_EMAIL).toBe('admin@example.com');
  });

  it('rejects a non-positive AUTH_RATE_LIMIT_LIMIT', () => {
    expect(() => validateEnv({ AUTH_RATE_LIMIT_LIMIT: '0' })).toThrow(
      /AUTH_RATE_LIMIT_LIMIT must be a positive integer/,
    );
  });

  it('parses AUTH_REGISTRATION_ENABLED as an optional boolean', () => {
    expect(validateEnv({}).AUTH_REGISTRATION_ENABLED).toBeUndefined();
    expect(
      validateEnv({ AUTH_REGISTRATION_ENABLED: 'false' })
        .AUTH_REGISTRATION_ENABLED,
    ).toBe(false);
  });

  it('parses the auth-reset variables (optional bool + positive ints)', () => {
    const bare = validateEnv({});
    expect(bare.AUTH_REQUIRE_VERIFIED_EMAIL).toBeUndefined();
    expect(bare.RESET_TOKEN_TTL_MINUTES).toBeUndefined();
    expect(bare.VERIFICATION_TOKEN_TTL_HOURS).toBeUndefined();
    expect(bare.VERIFICATION_RESEND_COOLDOWN_SECONDS).toBeUndefined();

    const configured = validateEnv({
      AUTH_REQUIRE_VERIFIED_EMAIL: 'true',
      RESET_TOKEN_TTL_MINUTES: '15',
      VERIFICATION_TOKEN_TTL_HOURS: '48',
      VERIFICATION_RESEND_COOLDOWN_SECONDS: '120',
    });
    expect(configured.AUTH_REQUIRE_VERIFIED_EMAIL).toBe(true);
    expect(configured.RESET_TOKEN_TTL_MINUTES).toBe(15);
    expect(configured.VERIFICATION_TOKEN_TTL_HOURS).toBe(48);
    expect(configured.VERIFICATION_RESEND_COOLDOWN_SECONDS).toBe(120);

    expect(() => validateEnv({ RESET_TOKEN_TTL_MINUTES: '0' })).toThrow(
      /RESET_TOKEN_TTL_MINUTES must be a positive integer/,
    );
  });

  it('parses AUDIT_RETENTION_DAYS (non-negative int, 0 allowed)', () => {
    expect(validateEnv({}).AUDIT_RETENTION_DAYS).toBeUndefined();
    expect(validateEnv({ AUDIT_RETENTION_DAYS: '30' }).AUDIT_RETENTION_DAYS).toBe(
      30,
    );
    expect(validateEnv({ AUDIT_RETENTION_DAYS: '0' }).AUDIT_RETENTION_DAYS).toBe(
      0,
    );
    expect(() => validateEnv({ AUDIT_RETENTION_DAYS: '-1' })).toThrow(
      /AUDIT_RETENTION_DAYS must be a non-negative integer/,
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

  it('passes the Google preset credentials through', () => {
    const result = validateEnv({
      OIDC_GOOGLE_CLIENT_ID: 'g-id',
      OIDC_GOOGLE_CLIENT_SECRET: 'g-secret',
    });

    expect(result.OIDC_GOOGLE_CLIENT_ID).toBe('g-id');
    expect(result.OIDC_GOOGLE_CLIENT_SECRET).toBe('g-secret');
  });

  it('passes the Keycloak preset config through', () => {
    const result = validateEnv({
      OIDC_KEYCLOAK_ISSUER: 'https://kc.example/realms/app',
      OIDC_KEYCLOAK_CLIENT_ID: 'kc-id',
      OIDC_KEYCLOAK_ROLES_CLAIM: 'realm_access.roles',
      OIDC_KEYCLOAK_LABEL: 'Company SSO',
    });

    expect(result.OIDC_KEYCLOAK_ISSUER).toBe('https://kc.example/realms/app');
    expect(result.OIDC_KEYCLOAK_CLIENT_ID).toBe('kc-id');
    expect(result.OIDC_KEYCLOAK_ROLES_CLAIM).toBe('realm_access.roles');
    expect(result.OIDC_KEYCLOAK_LABEL).toBe('Company SSO');
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

  it('leaves the mailer variables optional and passes them through', () => {
    expect(validateEnv({}).SMTP_URL).toBeUndefined();
    expect(validateEnv({}).MAIL_FROM).toBeUndefined();
    expect(validateEnv({}).MAIL_PREVIEW_DIR).toBeUndefined();

    const result = validateEnv({
      SMTP_URL: 'smtp://localhost:1025',
      MAIL_FROM: 'no-reply@example.test',
      MAIL_PREVIEW_DIR: 'tmp/outbox',
    });
    expect(result.SMTP_URL).toBe('smtp://localhost:1025');
    expect(result.MAIL_FROM).toBe('no-reply@example.test');
    expect(result.MAIL_PREVIEW_DIR).toBe('tmp/outbox');
  });

  it('rejects an empty optional variable', () => {
    expect(() => validateEnv({ MONGO_URI: '' })).not.toThrow();
    expect(() => validateEnv({ MONGO_URI: '   ' })).toThrow(
      /MONGO_URI must not be empty when provided/,
    );
  });
});
