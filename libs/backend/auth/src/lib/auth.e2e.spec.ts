import { INestApplication, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import {
  AppConfigModule,
  AppConfigService,
  AppHttpModule,
  EnvironmentVariables,
  GlobalExceptionFilter,
  LoggerModule,
  createValidationPipe,
  useRequestIdMiddleware,
} from '@org/backend-core';
import { UserModule } from '@org/backend-features-user';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthModule } from './auth.module';

function buildConfig(overrides: Partial<EnvironmentVariables> = {}) {
  return new AppConfigService(
    new ConfigService<EnvironmentVariables, true>({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: ['http://localhost:4200'],
      ...overrides,
    }),
  );
}

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    UserModule,
    AuthModule,
  ],
})
class TestAppModule {}

describe('Auth (e2e, real Mongo instance)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication;
  let authBaseUrl: string;
  let usersBaseUrl: string;

  const credentials = { email: 'jane.doe@example.com', password: 'Str0ng!Passw0rd' };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule, MongooseModule.forRoot(mongod.getUri())],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        buildConfig({ JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '1h' }),
      )
      .compile();

    app = moduleRef.createNestApplication();
    useRequestIdMiddleware(app);
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalPipes(createValidationPipe());
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    authBaseUrl = `http://127.0.0.1:${port}/auth`;
    usersBaseUrl = `http://127.0.0.1:${port}/users`;

    await fetch(usersBaseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...credentials,
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    });
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  async function login(payload: { email: string; password: string }) {
    const response = await fetch(`${authBaseUrl}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { response, body: await response.json() };
  }

  it('logs in with valid credentials and returns a JWT', async () => {
    const { response, body } = await login(credentials);

    expect(response.status).toBe(201);
    expect(typeof body.accessToken).toBe('string');
    expect(body.user).toEqual({ id: expect.any(String), roles: [] });
  });

  it('rejects a wrong password with 401', async () => {
    const { response, body } = await login({
      ...credentials,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with 401', async () => {
    const { response, body } = await login({
      email: 'nobody@example.com',
      password: credentials.password,
    });

    expect(response.status).toBe(401);
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects GET /auth/me without a token', async () => {
    const response = await fetch(`${authBaseUrl}/me`);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('UNAUTHENTICATED');
  });

  it('rejects GET /auth/me with a malformed token', async () => {
    const response = await fetch(`${authBaseUrl}/me`, {
      headers: { authorization: 'Bearer not-a-real-token' },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('UNAUTHENTICATED');
  });

  it('returns the current user for a valid token', async () => {
    const { body: loginBody } = await login(credentials);

    const response = await fetch(`${authBaseUrl}/me`, {
      headers: { authorization: `Bearer ${loginBody.accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(loginBody.user);
  });
});
