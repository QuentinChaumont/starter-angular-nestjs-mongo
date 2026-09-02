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
import { UserModule, UserService } from '@org/backend-features-user';
import { listenOnRandomPort, startTestMongo, TestMongo } from '@org/backend-testing';
import { AuthModule } from './auth.module';

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
  let testMongo: TestMongo;
  let app: INestApplication;
  let authBaseUrl: string;
  let usersBaseUrl: string;

  const credentials = { email: 'jane.doe@example.com', password: 'Str0ng!Passw0rd' };
  const adminCredentials = { email: 'admin@example.com', password: 'Str0ng!Passw0rd' };

  beforeAll(async () => {
    testMongo = await startTestMongo({
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
      // this suite fires far more than the default 10 auth calls / minute
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
    await app.init();
    const baseUrl = await listenOnRandomPort(app);
    authBaseUrl = `${baseUrl}/auth`;
    usersBaseUrl = `${baseUrl}/users`;

    // `POST /users` is admin-only now (global RolesGuard from AuthModule), so
    // seed the fixtures straight through the service.
    const users = app.get(UserService);
    await users.create({ ...credentials, firstName: 'Jane', lastName: 'Doe' });
    await users.create({
      ...adminCredentials,
      firstName: 'Ada',
      lastName: 'Admin',
      roles: ['admin'],
    });
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await testMongo.mongod.stop();
  });

  async function login(payload: { email: string; password: string }) {
    const response = await fetch(`${authBaseUrl}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { response, body: (await response.json()) as any };
  }

  it('exposes registration as enabled by default', async () => {
    const response = await fetch(`${authBaseUrl}/registration`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: true });
  });

  it('registers a new account and returns a session', async () => {
    const response = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'newcomer@example.com',
        password: 'Str0ng!Passw0rd',
        firstName: 'New',
        lastName: 'Comer',
      }),
    });
    const body: any = await response.json();

    expect(response.status).toBe(201);
    expect(typeof body.accessToken).toBe('string');
    expect(body.user).toEqual({ id: expect.any(String), roles: [] });
    expect(
      response.headers.getSetCookie().some((c) => c.startsWith('refresh_token=')),
    ).toBe(true);
  });

  it('rejects registering an email that already exists (409)', async () => {
    const response = await fetch(`${authBaseUrl}/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...credentials,
        firstName: 'Jane',
        lastName: 'Doe',
      }),
    });

    expect(response.status).toBe(409);
    expect(((await response.json()) as any).code).toBe(
      'USER_EMAIL_ALREADY_EXISTS',
    );
  });

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
    const body: any = await response.json();
    expect(body.code).toBe('UNAUTHENTICATED');
  });

  it('rejects GET /auth/me with a malformed token', async () => {
    const response = await fetch(`${authBaseUrl}/me`, {
      headers: { authorization: 'Bearer not-a-real-token' },
    });

    expect(response.status).toBe(401);
    const body: any = await response.json();
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

  it('rejects GET /auth/admin without a token (401)', async () => {
    const response = await fetch(`${authBaseUrl}/admin`);

    expect(response.status).toBe(401);
    const body: any = await response.json();
    expect(body.code).toBe('UNAUTHENTICATED');
  });

  it('rejects GET /auth/admin for an authenticated user without the role (403)', async () => {
    const { body: loginBody } = await login(credentials);

    const response = await fetch(`${authBaseUrl}/admin`, {
      headers: { authorization: `Bearer ${loginBody.accessToken}` },
    });

    expect(response.status).toBe(403);
    const body: any = await response.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  it('allows GET /auth/admin for a user with the admin role', async () => {
    const { body: loginBody } = await login(adminCredentials);

    const response = await fetch(`${authBaseUrl}/admin`, {
      headers: { authorization: `Bearer ${loginBody.accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(loginBody.user);
  });

  describe('admin-only user administration', () => {
    const newUser = {
      email: 'created-by-admin@example.com',
      password: 'Str0ng!Passw0rd',
      firstName: 'Cee',
      lastName: 'Ay',
    };

    function createUser(token?: string) {
      return fetch(usersBaseUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newUser),
      });
    }

    it('rejects POST /users without a token (401)', async () => {
      expect((await createUser()).status).toBe(401);
    });

    it('rejects POST /users for a non-admin (403)', async () => {
      const { body } = await login(credentials);
      expect((await createUser(body.accessToken)).status).toBe(403);
    });

    it('allows POST /users for an admin (201)', async () => {
      const { body } = await login(adminCredentials);
      const response = await createUser(body.accessToken);
      expect(response.status).toBe(201);
      expect(((await response.json()) as any).email).toBe(newUser.email);
    });
  });

  describe('refresh, rotation and logout', () => {
    type FetchResponse = Awaited<ReturnType<typeof fetch>>;

    class CookieJar {
      private readonly jar = new Map<string, string>();

      store(response: FetchResponse): void {
        for (const raw of response.headers.getSetCookie()) {
          const [pair] = raw.split(';');
          const eq = pair.indexOf('=');
          const name = pair.slice(0, eq).trim();
          const value = pair.slice(eq + 1).trim();
          if (value === '') {
            this.jar.delete(name);
          } else {
            this.jar.set(name, value);
          }
        }
      }

      get(name: string): string | undefined {
        return this.jar.get(name);
      }

      header(): string {
        return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
      }
    }

    async function loginWithJar(): Promise<CookieJar> {
      const jar = new CookieJar();
      const response = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      jar.store(response);
      return jar;
    }

    function refresh(jar: CookieJar, withCsrf = true): Promise<FetchResponse> {
      const headers: Record<string, string> = { cookie: jar.header() };
      if (withCsrf) {
        headers['x-csrf-token'] = jar.get('csrf-token') ?? '';
      }
      return fetch(`${authBaseUrl}/refresh`, { method: 'POST', headers });
    }

    it('login sets an httpOnly refresh cookie and a csrf cookie', async () => {
      const jar = await loginWithJar();

      expect(jar.get('refresh_token')).toBeDefined();
      expect(jar.get('csrf-token')).toBeDefined();
    });

    it('rejects refresh with a valid CSRF token but no refresh cookie', async () => {
      const response = await fetch(`${authBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          cookie: 'csrf-token=tok',
          'x-csrf-token': 'tok',
        },
      });

      expect(response.status).toBe(401);
      expect(((await response.json()) as any).code).toBe('REFRESH_TOKEN_MISSING');
    });

    it('rejects refresh with no cookies at all (CSRF guard, 403)', async () => {
      const response = await fetch(`${authBaseUrl}/refresh`, {
        method: 'POST',
        headers: { 'x-csrf-token': 'anything' },
      });

      expect(response.status).toBe(403);
    });

    it('rejects refresh without a matching X-CSRF-Token header (403)', async () => {
      const jar = await loginWithJar();

      const response = await refresh(jar, false);

      expect(response.status).toBe(403);
      expect(((await response.json()) as any).code).toBe('CSRF_TOKEN_INVALID');
    });

    it('rotates the refresh token and returns a fresh access token', async () => {
      const jar = await loginWithJar();
      const firstRefresh = jar.get('refresh_token');

      const response = await refresh(jar);
      jar.store(response);

      expect(response.status).toBe(201);
      const body: any = await response.json();
      expect(typeof body.accessToken).toBe('string');
      expect(body.tokenType).toBe('Bearer');
      expect(jar.get('refresh_token')).not.toBe(firstRefresh);
    });

    it('detects reuse of an already-rotated refresh token (401)', async () => {
      const jar = await loginWithJar();
      const stolen = jar.get('refresh_token') as string;
      const csrf = jar.get('csrf-token') as string;

      const rotated = await refresh(jar);
      jar.store(rotated);

      const replay = await fetch(`${authBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${stolen}; csrf-token=${csrf}`,
          'x-csrf-token': csrf,
        },
      });

      expect(replay.status).toBe(401);
      expect(((await replay.json()) as any).code).toBe('REFRESH_TOKEN_REUSED');

      // The rotated (still-live) token is now revoked too.
      const afterBreach = await refresh(jar);
      expect(afterBreach.status).toBe(401);
    });

    it('logout revokes the token and clears the cookies', async () => {
      const jar = await loginWithJar();

      const logout = await fetch(`${authBaseUrl}/logout`, {
        method: 'POST',
        headers: {
          cookie: jar.header(),
          'x-csrf-token': jar.get('csrf-token') ?? '',
        },
      });
      expect(logout.status).toBe(204);
      jar.store(logout);
      expect(jar.get('refresh_token')).toBeUndefined();
    });
  });
});
