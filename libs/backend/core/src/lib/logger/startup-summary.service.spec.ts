import type { AppConfigService } from '../config/app-config.service';
import type { AppLogger } from './app-logger.service';
import { StartupSummaryService } from './startup-summary.service';

const baseConfig = {
  app: { environment: 'development', port: 3000 },
  http: { corsOrigins: ['http://localhost:4200'], trustProxy: undefined },
  security: {
    rateLimit: { ttlSeconds: 60, limit: 100 },
    authRateLimit: { ttlSeconds: 60, limit: 10 },
  },
  mongo: { uri: 'mongodb://localhost/x' },
  mailer: { smtpUrl: undefined, previewDir: 'tmp/mail' },
  oidc: { issuer: undefined },
  oidcGoogle: { clientId: undefined },
  oidcKeycloak: { issuer: undefined },
  auth: { registrationEnabled: true, requireVerifiedEmail: false },
  audit: { retentionDays: 90 },
} as unknown as AppConfigService;

describe('StartupSummaryService', () => {
  const log = jest.fn();
  const logger = { log } as unknown as AppLogger;
  const original = process.env['NODE_ENV'];

  beforeEach(() => {
    log.mockReset();
    process.env['NODE_ENV'] = 'development';
  });
  afterAll(() => {
    process.env['NODE_ENV'] = original;
  });

  it('logs a summary block with the effective config', () => {
    new StartupSummaryService(baseConfig, logger).onApplicationBootstrap();

    const text = log.mock.calls.map((c) => c[0]).join('\n');
    expect(text).toContain('env:         development  port 3000');
    expect(text).toContain('mongo:       configured');
    expect(text).toContain('preview only → tmp/mail');
    expect(text).toContain('oidc:        none');
    expect(text).toContain('registration on');
    expect(log.mock.calls.every((c) => c[1] === 'Startup')).toBe(true);
  });

  it('flags a missing Mongo and lists configured OIDC providers', () => {
    const config = {
      ...baseConfig,
      mongo: { uri: undefined },
      oidcGoogle: { clientId: 'g' },
      oidcKeycloak: { issuer: 'https://kc' },
      audit: { retentionDays: 0 },
    } as unknown as AppConfigService;

    new StartupSummaryService(config, logger).onApplicationBootstrap();
    const text = log.mock.calls.map((c) => c[0]).join('\n');

    expect(text).toContain('NOT configured');
    expect(text).toContain('oidc:        google, keycloak');
    expect(text).toContain('kept forever');
  });

  it('does nothing under NODE_ENV=test or without config', () => {
    process.env['NODE_ENV'] = 'test';
    new StartupSummaryService(baseConfig, logger).onApplicationBootstrap();
    process.env['NODE_ENV'] = 'development';
    new StartupSummaryService(null, logger).onApplicationBootstrap();
    expect(log).not.toHaveBeenCalled();
  });
});
