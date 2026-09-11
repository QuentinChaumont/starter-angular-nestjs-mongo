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
import { InMemoryMailTransport, MAIL_TRANSPORT } from '@org/backend-mailer';
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
  // Backdated but excluded on the two hard safety rails (finding #5):
  // never `admin`, never `disabledAt`-set — see `UserRepository.findRetentionCandidates`.
  const disabled = {
    email: 'disabled.dan@example.com',
    password: 'Str0ng!Passw0rd',
    firstName: 'Disabled',
    lastName: 'Dan',
  };
  let staleId: string;
  let recentId: string;
  let disabledId: string;
  let adminId: string;
  let adminToken: string;
  let mail: InMemoryMailTransport;

  beforeAll(async () => {
    testMongo = await startTestMongo({
      JWT_SECRET: 'test-secret',
      AUTH_RATE_LIMIT_LIMIT: 1000,
    });
    mail = new InMemoryMailTransport();

    const moduleRef = await Test.createTestingModule({
      imports: [
        TestAppModule,
        MongooseModule.forRoot(testMongo.mongod.getUri()),
      ],
    })
      .overrideProvider(AppConfigService)
      .useValue(testMongo.config)
      .overrideProvider(MAIL_TRANSPORT)
      .useValue(mail)
      .compile();

    app = moduleRef.createNestApplication();
    useRequestIdMiddleware(app);
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalPipes(createValidationPipe());
    baseUrl = await listenOnRandomPort(app);

    userModel = app.get<Model<User>>(getModelToken(User.name));

    // Seeded admin, created directly (not through the public register flow).
    const adminCreated = await app.get(UserService).create({
      ...admin,
      firstName: 'Ada',
      lastName: 'Admin',
      roles: ['admin'],
    });
    adminId = adminCreated._id.toString();

    const login = await (
      await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(admin),
      })
    ).json();
    adminToken = (login as { accessToken: string }).accessToken;

    // Ordinary accounts, created through the real HTTP endpoint.
    // `UserController` is `@Roles('admin')` at class level once the auth
    // brick is installed, so this needs the admin's bearer token too.
    const staleCreated = await registerUser(stale);
    staleId = staleCreated._id;
    const recentCreated = await registerUser(recent);
    recentId = recentCreated._id;
    const disabledCreated = await registerUser(disabled);
    disabledId = disabledCreated._id;

    // Backdate the stale user's last activity well past any inactivity
    // window the test configures below — `recent` is left untouched, so
    // its reference date falls back to its (fresh) `createdAt`. The admin
    // and the disabled account are backdated identically to the stale
    // user, so surviving the sweep proves the role/disabled exclusion
    // rather than merely not being stale (finding #5).
    await userModel.updateOne(
      { _id: staleId },
      { $set: { lastActiveAt: new Date(Date.now() - 40 * DAY_MS) } },
    );
    await userModel.updateOne(
      { _id: adminId },
      { $set: { lastActiveAt: new Date(Date.now() - 40 * DAY_MS) } },
    );
    await userModel.updateOne(
      { _id: disabledId },
      {
        $set: {
          lastActiveAt: new Date(Date.now() - 40 * DAY_MS),
          disabledAt: new Date(),
        },
      },
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

  it('warns the stale account and leaves the recent, admin and disabled accounts alone', async () => {
    const result = await runSweep();
    // Exactly one warning — if the admin/disabled exclusion (finding #5)
    // were dropped or inverted, the backdated admin and disabled accounts
    // (also stale as of `beforeAll`) would inflate this count.
    expect(result).toEqual({ warned: 1, deleted: 0 });

    const staleDoc = await userModel.findById(staleId).exec();
    expect(staleDoc?.retentionWarnedAt).toBeInstanceOf(Date);

    const still = await getUser(recentId);
    expect(still.status).toBe(200);

    const adminDoc = await userModel.findById(adminId).exec();
    expect(adminDoc?.retentionWarnedAt).toBeUndefined();
    const disabledDoc = await userModel.findById(disabledId).exec();
    expect(disabledDoc?.retentionWarnedAt).toBeUndefined();

    // Finding #1: the stale account was already 40 days inactive when
    // first warned (30 days past `inactiveDays: 30`) — well past the
    // point where the naive `lastActiveAt + inactiveDays` formula lands
    // in the past. The email must never state a deletion date earlier
    // than "warningDays from now", the earliest the delete-phase guard
    // could actually remove the account.
    expect(mail.sent).toHaveLength(1);
    const earliestPossibleDeletion = new Date(Date.now() + 7 * DAY_MS);
    const expectedDate = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(earliestPossibleDeletion);
    expect(mail.sent[0].text).toContain(expectedDate);

    // Finding #3: no OIDC frontend URL is configured in this test's env,
    // so the call-to-action link must fall back to the configured CORS
    // origin — never a bare, unusable relative path.
    expect(mail.sent[0].text).toContain('http://localhost:4200/app/profile');
    expect(mail.sent[0].text).not.toContain('undefined/app/profile');
  });

  it('deletes the stale account once the warning window has elapsed, sparing admin and disabled accounts', async () => {
    await userModel.updateOne(
      { _id: staleId },
      { $set: { retentionWarnedAt: new Date(Date.now() - 8 * DAY_MS) } },
    );
    // Simulate the admin/disabled accounts also carrying an elapsed
    // warning, so this exercises the delete-phase's own exclusion
    // directly rather than only inheriting it from never being warned.
    await userModel.updateOne(
      { _id: adminId },
      { $set: { retentionWarnedAt: new Date(Date.now() - 8 * DAY_MS) } },
    );
    await userModel.updateOne(
      { _id: disabledId },
      { $set: { retentionWarnedAt: new Date(Date.now() - 8 * DAY_MS) } },
    );

    const result = await runSweep();
    expect(result).toEqual({ warned: 0, deleted: 1 });

    const adminStill = await userModel.findById(adminId).exec();
    expect(adminStill).not.toBeNull();
    const disabledStill = await userModel.findById(disabledId).exec();
    expect(disabledStill).not.toBeNull();
  });

  it('purges the account (404), audits it, and spares the recent, admin and disabled accounts', async () => {
    const gone = await getUser(staleId);
    expect(gone.status).toBe(404);

    const still = await getUser(recentId);
    expect(still.status).toBe(200);
    expect((await still.json()).email).toBe(recent.email);

    const adminStill = await getUser(adminId);
    expect(adminStill.status).toBe(200);
    const disabledStill = await getUser(disabledId);
    expect(disabledStill.status).toBe(200);

    const [row] = await findAudit('action=account.purged&pageSize=1');
    expect(row).toMatchObject({
      action: 'account.purged',
      target: staleId,
      targetType: 'user',
      meta: { email: stale.email, reason: 'retention' },
    });
  });
});
