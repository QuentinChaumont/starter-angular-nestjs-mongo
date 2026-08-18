import { validateEnv } from './validate-env';

describe('validateEnv', () => {
  it('applies default values when nothing is provided', () => {
    const result = validateEnv({});

    expect(result).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
    });
  });

  it('parses provided values', () => {
    const result = validateEnv({
      NODE_ENV: 'production',
      PORT: '4000',
      CORS_ORIGINS: 'https://example.com, https://admin.example.com',
    });

    expect(result).toEqual({
      NODE_ENV: 'production',
      PORT: 4000,
      CORS_ORIGINS: ['https://example.com', 'https://admin.example.com'],
    });
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
