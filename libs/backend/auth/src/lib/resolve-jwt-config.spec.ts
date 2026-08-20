import { buildTestConfig as buildConfig } from '@org/backend-testing';
import { resolveJwtConfig } from './resolve-jwt-config';

describe('resolveJwtConfig', () => {
  it('returns the configured secret and expiresIn', () => {
    const config = buildConfig({ JWT_SECRET: 'top-secret', JWT_EXPIRES_IN: '1h' });

    expect(resolveJwtConfig(config)).toEqual({
      secret: 'top-secret',
      expiresIn: '1h',
    });
  });

  it('defaults expiresIn when not configured', () => {
    const config = buildConfig({ JWT_SECRET: 'top-secret' });

    expect(resolveJwtConfig(config)).toEqual({
      secret: 'top-secret',
      expiresIn: '15m',
    });
  });

  it('throws a readable error when JWT_SECRET is not set', () => {
    const config = buildConfig();

    expect(() => resolveJwtConfig(config)).toThrow(/JWT_SECRET must be set/);
  });
});
