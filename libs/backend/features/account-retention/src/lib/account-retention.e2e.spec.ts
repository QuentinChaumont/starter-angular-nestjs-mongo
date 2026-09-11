import { INestApplication, Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
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
import { UserModule, UserService, User } from '@org/backend-features-user';
import { AppSettingsModule } from '@org/backend-features-app-settings';
import { MailerModule } from '@org/backend-mailer';
import {
  listenOnRandomPort,
  startTestMongo,
  TestMongo,
} from '@org/backend-testing';
import type { Model } from 'mongoose';
import { AuditModule } from '@org/backend-features-audit';
import { AccountRetentionModule } from './account-retention.module';

const DAY_MS = 24 * 60 * 60 * 1000;

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    UserModule,
    AuthModule,
    AppSettingsModule,
    AccountRetentionModule,
    AuditModule,
    MailerModule,
  ],
})
class TestAppModule {}

describe('Account retention sweep (e2e, real Mongo instance)', () => {
  let testMongo: TestMongo;
  let app: INestApplication;
  let baseUrl: string;
  let userModel: Model<User>;

  const admin = { email: 'ada.admin@example.com', password: 'Str0ng!Passw0rd' };
  const stale = {
    email: 'stale.sam@example.com',
    password: 'Str0ng!Passw0rd',
    firstName: 'Stale',
    lastName: 'Sam',
  };
  const recent = {
    email: 'fresh.fiona@example.com',
    password: 'Str0ng!Passw0rd',
    firstName: 'Fresh',
    lastName: 'Fiona',
  };
  let staleId: string;
  let recentId: string;
  let adminToken: string;

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

    userModel = app.get<Model<User>>(getModelToken(User.name));

    // Seeded admin, created directly (not through the public register flow).
    await app.get(UserService).create({
      ...admin,
      firstName: 'Ada',
      lastName: 'Admin',
      roles: ['admin'],
    });

    const login = await (
      await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(admin),
      })
    ).json();
    adminToken = (login as { accessToken: string }).accessToken;

    // Two ordinary accounts, created through the real HTTP endpoint.
    // `UserController` is `@Roles('admin')` at class level once the auth
    // brick is installed, so this needs the admin's bearer token too.
    const staleCreated = await registerUser(stale);
    staleId = staleCreated._id;
    const recentCreated = await registerUser(recent);
    recentId = recentCreated._id;

    // Backdate the stale user's last activity well past any inactivity
    // window the test configures below — `recent` is left untouched, so
    // its reference date falls back to its (fresh) `createdAt`.
    await userModel.updateOne(
      { _id: staleId },
      { $set: { lastActiveAt: new Date(Date.now() - 40 * DAY_MS) } },
    );

    const patched = await fetch(`${baseUrl}/admin/settings`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        accountRetention: { inactiveDays: 30, warningDays: 7 },
      }),
    });
    expect(patched.status).toBe(200);
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await testMongo.mongod.stop();
  });

  async function registerUser(payload: Record<string, unknown>) {
    const res = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as { _id: string };
  }

  const getUser = (id: string) =>
    fetch(`${baseUrl}/users/${id}`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });

  const runSweep = async (): Promise<{ warned: number; deleted: number }> => {
    const res = await fetch(`${baseUrl}/admin/account-retention/run`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    return (await res.json()) as { warned: number; deleted: number };
  };

  /** Poll the audit endpoint — `record()` is fire-and-forget. */
  const findAudit = async (query: string): Promise<any[]> => {
    for (let i = 0; i < 20; i += 1) {
      const res = await fetch(`${baseUrl}/audit?${query}`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const body = (await res.json()) as any;
      if (body.items?.length) {
        return body.items;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    return [];
  };

  it('warns the stale account and leaves the recent one alone', async () => {
    const result = await runSweep();
    expect(result).toEqual({ warned: 1, deleted: 0 });

    const staleDoc = await userModel.findById(staleId).exec();
    expect(staleDoc?.retentionWarnedAt).toBeInstanceOf(Date);

    const still = await getUser(recentId);
    expect(still.status).toBe(200);
  });

  it('deletes the stale account once the warning window has elapsed', async () => {
    await userModel.updateOne(
      { _id: staleId },
      { $set: { retentionWarnedAt: new Date(Date.now() - 8 * DAY_MS) } },
    );

    const result = await runSweep();
    expect(result).toEqual({ warned: 0, deleted: 1 });
  });

  it('purges the account (404), audits it, and spares the recent one', async () => {
    const gone = await getUser(staleId);
    expect(gone.status).toBe(404);

    const still = await getUser(recentId);
    expect(still.status).toBe(200);
    expect((await still.json()).email).toBe(recent.email);

    const [row] = await findAudit('action=account.purged&pageSize=1');
    expect(row).toMatchObject({
      action: 'account.purged',
      target: staleId,
      targetType: 'user',
      meta: { email: stale.email, reason: 'retention' },
    });
  });
});
