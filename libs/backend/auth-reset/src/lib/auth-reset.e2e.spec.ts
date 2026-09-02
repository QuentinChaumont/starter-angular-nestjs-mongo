import { INestApplication, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { AuthModule } from '@org/backend-auth';
import {
  AppConfigModule,
  AppConfigService,
  AppHttpModule,
  GlobalExceptionFilter,
  LoggerModule,
  createValidationPipe,
  useRequestIdMiddleware,
} from '@org/backend-core';
import { UserModule, UserService } from '@org/backend-features-user';
import { InMemoryMailTransport, MAIL_TRANSPORT } from '@org/backend-mailer';
import {
  listenOnRandomPort,
  startTestMongo,
  TestMongo,
} from '@org/backend-testing';
import { AuthResetModule } from './auth-reset.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    UserModule,
    AuthModule,
    AuthResetModule,
  ],
})
class TestAppModule {}

const password = 'Str0ng!Passw0rd';

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

class CookieJar {
  private readonly jar = new Map<string, string>();
  store(response: FetchResponse): void {
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === '') this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }
  get(name: string): string | undefined {
    return this.jar.get(name);
  }
  header(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

describe('auth-reset (e2e, real Mongo instance)', () => {
  let testMongo: TestMongo;
  let app: INestApplication;
  let baseUrl: string;
  let mail: InMemoryMailTransport;
  let users: UserService;

  const post = (path: string, body: unknown, token?: string) =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

  const linkToken = (body: string): string =>
    new URL(/https?:\/\/\S+/.exec(body)?.[0] ?? '').searchParams.get(
      'token',
    ) as string;

  beforeAll(async () => {
    testMongo = await startTestMongo({
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
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
    await app.init();
    baseUrl = await listenOnRandomPort(app);
    users = app.get(UserService);
  }, 60_000);

  afterEach(() => mail.clear());
  afterAll(async () => {
    await app.close();
    await testMongo.mongod.stop();
  });

  describe('forgot / reset password', () => {
    const email = 'reset-me@example.com';

    beforeAll(async () => {
      await users.create({ email, password, firstName: 'Reg', lastName: 'Ex' });
      mail.clear();
    });

    it('answers 202 and sends nothing for an unknown address', async () => {
      const res = await post('/auth/forgot-password', {
        email: 'nobody@example.com',
      });
      expect(res.status).toBe(202);
      expect(mail.sent).toHaveLength(0);
    });

    it('answers 202 and emails a reset link for a known address', async () => {
      const res = await post('/auth/forgot-password', { email });
      expect(res.status).toBe(202);
      expect(mail.sent).toHaveLength(1);
      expect(mail.last?.to).toBe(email);
      expect(linkToken(mail.last?.text ?? '')).toBeTruthy();
    });

    it('rejects a bad token with 400', async () => {
      const res = await post('/auth/reset-password', {
        token: 'not-a-real-token',
        password: 'An0ther!Pass',
      });
      expect(res.status).toBe(400);
    });

    it('resets the password and revokes every existing session', async () => {
      // an active session, to be killed by the reset
      const jar = new CookieJar();
      jar.store(await post('/auth/login', { email, password }));

      await post('/auth/forgot-password', { email });
      const token = linkToken(mail.last?.text ?? '');

      const newPassword = 'Br4nd!NewPass';
      const reset = await post('/auth/reset-password', {
        token,
        password: newPassword,
      });
      expect(reset.status).toBe(204);

      // token is single-use
      expect(
        (await post('/auth/reset-password', { token, password: newPassword }))
          .status,
      ).toBe(400);

      // the old refresh cookie no longer works
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          cookie: jar.header(),
          'x-csrf-token': jar.get('csrf-token') ?? '',
        },
      });
      expect(refresh.status).toBe(401);

      // the new password works, the old one doesn't
      expect((await post('/auth/login', { email, password })).status).toBe(401);
      expect(
        (await post('/auth/login', { email, password: newPassword })).status,
      ).toBe(201);
    });
  });

  describe('email verification', () => {
    it('emails a verification link on registration, and verify-email stamps the user', async () => {
      const email = 'verify-me@example.com';
      const register = await post('/auth/register', {
        email,
        password,
        firstName: 'Ver',
        lastName: 'Ify',
      });
      expect(register.status).toBe(201);
      const { accessToken } = (await register.json()) as {
        accessToken: string;
      };

      const verifyMail = mail.sent.find((m) => m.to === email);
      expect(verifyMail).toBeDefined();
      const token = linkToken(verifyMail?.text ?? '');

      const before = await fetch(`${baseUrl}/auth/me`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(
        ((await before.json()) as { emailVerifiedAt: unknown }).emailVerifiedAt,
      ).toBeNull();

      expect((await post('/auth/verify-email', { token })).status).toBe(204);

      const after = await fetch(`${baseUrl}/auth/me`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(
        ((await after.json()) as { emailVerifiedAt: unknown }).emailVerifiedAt,
      ).toEqual(expect.any(String));
    });

    it('re-sends a verification link when the email is changed via PATCH /users/me', async () => {
      const email = 'mover@example.com';
      const created = await users.create({
        email,
        password,
        firstName: 'Mo',
        lastName: 'Ver',
      });
      await users.markEmailVerified(created._id.toString());
      const login = await post('/auth/login', { email, password });
      const { accessToken } = (await login.json()) as { accessToken: string };
      mail.clear();

      const newEmail = 'moved@example.com';
      const patch = await fetch(`${baseUrl}/users/me`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: newEmail }),
      });
      expect(patch.status).toBe(200);

      // the event listener runs after the response; give it a tick
      await new Promise((r) => setTimeout(r, 50));
      const verifyMail = mail.sent.find((m) => m.to === newEmail);
      expect(verifyMail).toBeDefined();
      const token = linkToken(verifyMail?.text ?? '');
      expect((await post('/auth/verify-email', { token })).status).toBe(204);
    });
  });
});
