import { buildTestConfig as buildConfig } from '@org/backend-testing';
import { resolveMongoUri } from './resolve-mongo-uri';

describe('resolveMongoUri', () => {
  it('returns the configured URI when it is a valid mongodb:// URI', () => {
    const config = buildConfig({ MONGO_URI: 'mongodb://localhost:27017/app' });
    expect(resolveMongoUri(config)).toBe('mongodb://localhost:27017/app');
  });

  it('accepts a mongodb+srv:// URI', () => {
    const config = buildConfig({
      MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/app',
    });
    expect(resolveMongoUri(config)).toBe(
      'mongodb+srv://user:pass@cluster.mongodb.net/app',
    );
  });

  it('throws a readable error when MONGO_URI is not set', () => {
    const config = buildConfig();
    expect(() => resolveMongoUri(config)).toThrow(/MONGO_URI must be set/);
  });

  it('throws a readable error when MONGO_URI has an invalid scheme', () => {
    const config = buildConfig({ MONGO_URI: 'postgres://localhost/app' });
    expect(() => resolveMongoUri(config)).toThrow(
      /MONGO_URI must start with/,
    );
  });
});
