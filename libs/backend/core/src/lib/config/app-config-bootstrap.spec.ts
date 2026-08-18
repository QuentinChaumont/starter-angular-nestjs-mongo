import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { validateEnv } from './validate-env';

/**
 * `AppConfigModule` wires `validateEnv` into `ConfigModule.forRoot()`, which
 * runs validation synchronously as soon as the module is built. These tests
 * exercise that exact wiring directly (building a fresh `forRoot()` call per
 * test) so each scenario reads the `process.env` set for it, rather than
 * whatever was present when `AppConfigModule` itself was first imported.
 */
describe('Nest bootstrap with app configuration validation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('boots when the environment is valid', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      PORT: '3100',
      CORS_ORIGINS: 'http://localhost:4200',
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnv,
        }),
      ],
    }).compile();

    await moduleRef.close();
  });

  it('refuses to boot when the environment is invalid', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'not-a-real-environment',
    };

    await expect(
      Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            validate: validateEnv,
          }),
        ],
      }).compile(),
    ).rejects.toThrow(/NODE_ENV must be one of/);
  });
});
