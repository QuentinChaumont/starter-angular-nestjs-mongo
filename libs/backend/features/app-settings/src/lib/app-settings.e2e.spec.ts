import { INestApplication, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import {
  AppConfigModule,
  AppConfigService,
  AppHttpModule,
  GlobalExceptionFilter,
  LoggerModule,
  createValidationPipe,
  useRequestIdMiddleware,
} from '@org/backend-core';
import { AuthModule } from '@org/backend-auth';
import { AppSettingsModule } from './app-settings.module';
import { UserModule, UserService } from '@org/backend-features-user';
import {
  listenOnRandomPort,
  startTestMongo,
  TestMongo,
} from '@org/backend-testing';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    UserModule,
    AuthModule,
    AppSettingsModule,
  ],
})
class TestAppModule {}

describe('App settings (e2e, real Mongo instance)', () => {
  let testMongo: TestMongo;
  let app: INestApplication;
  let baseUrl: string;

  const admin = { email: 'ada.admin@example.com', password: 'Str0ng!Passw0rd' };
  const member = { email: 'bob@example.com', password: 'Str0ng!Passw0rd' };

  beforeAll(async () => {
    testMongo = await startTestMongo({
      JWT_SECRET: 'test-secret',
      AUTH_RATE_LIMIT_LIMIT: 1000,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [
        TestAppModule,
        MongooseModule.forRoot(testMongo.mongod.getUri()),
      ],
    })
      .overrideProvider(AppConfigService)
      .useValue(testMongo.config)
      .compile();

    app = moduleRef.createNestApplication();
    useRequestIdMiddleware(app);
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalPipes(createValidationPipe());
    baseUrl = await listenOnRandomPort(app);

    const users = app.get(UserService);
    await users.create({
      ...admin,
      firstName: 'Ada',
      lastName: 'Admin',
      roles: ['admin'],
    });
    await users.create({
      ...member,
      firstName: 'Bob',
      lastName: 'Bee',
    });
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await testMongo.mongod.stop();
  });

  const login = async (creds: { email: string; password: string }) => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(creds),
    });
    return (await res.json()) as { accessToken: string };
  };

  it('exposes the public settings block without authentication', async () => {
    const res = await fetch(`${baseUrl}/public/settings`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      accountRetention: { inactiveDays: null, warningDays: null },
    });
  });

  it('rejects the admin settings read with no token (401)', async () => {
    const res = await fetch(`${baseUrl}/admin/settings`);
    expect(res.status).toBe(401);
  });

  it('rejects the admin settings read for a non-admin (403)', async () => {
    const { accessToken } = await login(member);
    const res = await fetch(`${baseUrl}/admin/settings`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('lets an admin patch the retention settings and reflects it publicly', async () => {
    const { accessToken } = await login(admin);
    const patch = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        accountRetention: { inactiveDays: 180, warningDays: 14 },
      }),
    });
    expect(patch.status).toBe(200);
    expect(await patch.json()).toEqual({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });

    const pub = await fetch(`${baseUrl}/public/settings`);
    expect(await pub.json()).toEqual({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
  });

  it('rejects an invalid retention patch with 400 INVALID_SETTINGS', async () => {
    const { accessToken } = await login(admin);
    const res = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        accountRetention: { inactiveDays: 10, warningDays: 10 },
      }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe(
      'INVALID_SETTINGS',
    );
  });
});
