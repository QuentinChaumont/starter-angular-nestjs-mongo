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
import { UserModule, UserService } from '@org/backend-features-user';
import {
  listenOnRandomPort,
  startTestMongo,
  TestMongo,
} from '@org/backend-testing';
import { AuditModule } from './audit.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    UserModule,
    AuthModule,
    AuditModule,
  ],
})
class TestAppModule {}

describe('Audit log (e2e, real Mongo instance)', () => {
  let testMongo: TestMongo;
  let app: INestApplication;
  let baseUrl: string;

  const admin = { email: 'ada.admin@example.com', password: 'Str0ng!Passw0rd' };
  const target = { email: 'bob@example.com', password: 'Str0ng!Passw0rd' };
  let targetId: string;

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
    const created = await users.create({
      ...target,
      firstName: 'Bob',
      lastName: 'Bee',
    });
    targetId = created._id.toString();
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
    return (await res.json()) as any;
  };

  /** Poll the audit endpoint — `record()` is fire-and-forget. */
  const findAudit = async (
    token: string,
    query: string,
  ): Promise<any[]> => {
    for (let i = 0; i < 20; i += 1) {
      const res = await fetch(`${baseUrl}/audit?${query}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = (await res.json()) as any;
      if (body.items?.length) {
        return body.items;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    return [];
  };

  it('records a successful login', async () => {
    const { accessToken } = await login(admin);
    const [row] = await findAudit(accessToken, 'action=auth.login&pageSize=1');
    expect(row).toMatchObject({
      action: 'auth.login',
      targetType: 'user',
      meta: { method: 'password' },
    });
    expect(row.actorId).toEqual(expect.any(String));
  });

  it('records a failed login with the attempted email and no actor', async () => {
    const bad = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'ghost@example.com',
        password: 'wrong-but-long-enough',
      }),
    });
    expect(bad.status).toBe(401);
    const { accessToken } = await login(admin);
    const [row] = await findAudit(
      accessToken,
      'action=auth.login-failed&pageSize=1',
    );
    expect(row).toMatchObject({
      action: 'auth.login-failed',
      actorId: null,
      actorEmail: 'ghost@example.com',
      meta: { reason: 'INVALID_CREDENTIALS' },
    });
  });

  it('attributes an admin role change to the acting admin', async () => {
    const { accessToken } = await login(admin);

    const patch = await fetch(`${baseUrl}/users/${targetId}/roles`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ roles: ['editor'] }),
    });
    expect(patch.status).toBe(200);

    const [row] = await findAudit(
      accessToken,
      'action=admin.roles-changed&pageSize=1',
    );
    expect(row).toMatchObject({
      action: 'admin.roles-changed',
      target: targetId,
      targetType: 'user',
      meta: { roles: ['editor'] },
    });
    // actor is the admin, not the target
    expect(row.actorId).not.toBe(targetId);
    expect(row.actorId).toEqual(expect.any(String));
  });

  it('is admin-only', async () => {
    const { accessToken } = await login(target);
    const res = await fetch(`${baseUrl}/audit`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('exposes the distinct action list', async () => {
    const { accessToken } = await login(admin);
    const res = await fetch(`${baseUrl}/audit/actions`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const actions = (await res.json()) as string[];
    expect(actions).toEqual(expect.arrayContaining(['auth.login']));
  });
});
