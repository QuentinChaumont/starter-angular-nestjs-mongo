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
import {
  listenOnRandomPort,
  startTestMongo,
  TestMongo,
} from '@org/backend-testing';
import { AuthModule } from './auth.module';
import { IdentityService } from './identity/identity.service';
import { generateTotp } from './two-factor/totp';

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

  const credentials = {
    email: 'jane.doe@example.com',
    password: 'Str0ng!Passw0rd',
  };
  const adminCredentials = {
    email: 'admin@example.com',
    password: 'Str0ng!Passw0rd',
  };

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
      response.headers
        .getSetCookie()
        .some((c) => c.startsWith('refresh_token=')),
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
    // `/auth/me` adds `emailVerifiedAt` (null here — unverified), which the
    // login response's `user` doesn't carry.
    expect(await response.json()).toEqual({
      ...loginBody.user,
      emailVerifiedAt: null,
    });
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
      expect(((await response.json()) as any).code).toBe(
        'REFRESH_TOKEN_MISSING',
      );
    });

    it('rejects refresh with no cookies at all (CSRF guard, 401)', async () => {
      const response = await fetch(`${authBaseUrl}/refresh`, {
        method: 'POST',
        headers: { 'x-csrf-token': 'anything' },
      });

      expect(response.status).toBe(401);
    });

    it('rejects refresh without a matching X-CSRF-Token header (401)', async () => {
      const jar = await loginWithJar();

      const response = await refresh(jar, false);

      expect(response.status).toBe(401);
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

  describe('profile (/users/me) and change-password', () => {
    /** Grabs a cookie value from a Set-Cookie header line. */
    function cookie(response: Response, name: string): string {
      const line = response.headers
        .getSetCookie()
        .find((c) => c.startsWith(`${name}=`));
      return line ? line.slice(name.length + 1).split(';')[0] : '';
    }

    it('GET /users/me is 401 without a token, 200 with', async () => {
      expect((await fetch(`${usersBaseUrl}/me`)).status).toBe(401);

      const { body } = await login(credentials);
      const res = await fetch(`${usersBaseUrl}/me`, {
        headers: { authorization: `Bearer ${body.accessToken}` },
      });
      expect(res.status).toBe(200);
      const profile = (await res.json()) as any;
      expect(profile).toMatchObject({
        email: credentials.email,
        firstName: 'Jane',
        roles: [],
        emailVerifiedAt: null,
      });
      expect(typeof profile.createdAt).toBe('string');
    });

    const patchMe = (accessToken: string, patch: unknown) =>
      fetch(`${usersBaseUrl}/me`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(patch),
      });

    it('PATCH /users/me updates the name', async () => {
      const { body } = await login(credentials);
      const res = await patchMe(body.accessToken, { lastName: 'Renamed' });
      expect(res.status).toBe(200);
      const profile = (await res.json()) as any;
      expect(profile.lastName).toBe('Renamed');
      expect(profile.firstName).toBe('Jane'); // untouched
    });

    it('PATCH /users/me changes the email and clears its verified status', async () => {
      const email = 'email-change@example.com';
      const password = 'Str0ng!Passw0rd';
      const created = await app
        .get(UserService)
        .create({ email, password, firstName: 'E', lastName: 'C' });
      await app.get(UserService).markEmailVerified(created._id.toString());

      const login1 = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const { accessToken } = (await login1.json()) as any;

      const res = await patchMe(accessToken, { email: 'moved@example.com' });
      expect(res.status).toBe(200);
      const profile = (await res.json()) as any;
      expect(profile.email).toBe('moved@example.com');
      expect(profile.emailVerifiedAt).toBeNull();

      // the old address no longer logs in, the new one does
      const oldLogin = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(oldLogin.status).toBe(401);
    });

    it('rejects PATCH /users/me with an email that already exists (409)', async () => {
      const { body } = await login(credentials);
      const res = await patchMe(body.accessToken, {
        email: adminCredentials.email,
      });
      expect(res.status).toBe(409);
      expect(((await res.json()) as any).code).toBe(
        'USER_EMAIL_ALREADY_EXISTS',
      );
    });

    it('DELETE /users/me needs the right password and then wipes the account', async () => {
      const email = 'delete-me@example.com';
      const password = 'Str0ng!Passw0rd';
      await app
        .get(UserService)
        .create({ email, password, firstName: 'D', lastName: 'M' });
      const login1 = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const { accessToken } = (await login1.json()) as any;

      const del = (pw: string) =>
        fetch(`${usersBaseUrl}/me`, {
          method: 'DELETE',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ password: pw }),
        });

      expect((await del('nope')).status).toBe(400);
      expect((await del(password)).status).toBe(204);

      // the account is gone
      const relogin = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(relogin.status).toBe(401);
    });

    async function changePassword(
      accessToken: string,
      cookieHeader: string,
      dto: { currentPassword: string; newPassword: string },
    ) {
      return fetch(`${authBaseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
          cookie: cookieHeader,
        },
        body: JSON.stringify(dto),
      });
    }

    it('rejects a wrong current password with 400 and touches nothing', async () => {
      const email = 'change-pw-guard@example.com';
      const password = 'Str0ng!Passw0rd';
      await app
        .get(UserService)
        .create({ email, password, firstName: 'C', lastName: 'P' });
      const login1 = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const { accessToken } = (await login1.json()) as any;

      const res = await changePassword(
        accessToken,
        `refresh_token=${cookie(login1, 'refresh_token')}`,
        { currentPassword: 'wrong', newPassword: 'An0ther!Pass' },
      );
      expect(res.status).toBe(400);
      // old password still works
      const relogin = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(relogin.status).toBe(201);
    });

    it('changes the password, revokes other sessions, keeps the current one', async () => {
      const email = 'change-pw-ok@example.com';
      const password = 'Str0ng!Passw0rd';
      const newPassword = 'Br4nd!NewPass';
      await app
        .get(UserService)
        .create({ email, password, firstName: 'C', lastName: 'P' });

      const doLogin = () =>
        fetch(`${authBaseUrl}/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

      const sessionA = await doLogin();
      const sessionB = await doLogin();
      const { accessToken: tokenA } = (await sessionA.json()) as any;
      const refreshA = cookie(sessionA, 'refresh_token');
      const csrfA = cookie(sessionA, 'csrf-token');
      const refreshB = cookie(sessionB, 'refresh_token');
      const csrfB = cookie(sessionB, 'csrf-token');

      const res = await changePassword(
        tokenA,
        `refresh_token=${refreshA}; csrf-token=${csrfA}`,
        { currentPassword: password, newPassword },
      );
      expect(res.status).toBe(204);

      // session B is dead, session A still refreshes
      const refreshBRes = await fetch(`${authBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${refreshB}; csrf-token=${csrfB}`,
          'x-csrf-token': csrfB,
        },
      });
      expect(refreshBRes.status).toBe(401);

      const refreshARes = await fetch(`${authBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${refreshA}; csrf-token=${csrfA}`,
          'x-csrf-token': csrfA,
        },
      });
      expect(refreshARes.status).toBe(201);

      // the new password is in effect
      const withNew = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: newPassword }),
      });
      expect(withNew.status).toBe(201);
    });
  });

  describe('connected accounts (/auth/identities)', () => {
    const identityUser = {
      email: 'linker@example.com',
      password: 'Str0ng!Passw0rd',
    };

    async function token(): Promise<string> {
      const { body } = await login(identityUser);
      return body.accessToken as string;
    }

    const list = (accessToken: string) =>
      fetch(`${authBaseUrl}/identities`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });

    beforeAll(async () => {
      await app.get(UserService).create({
        ...identityUser,
        firstName: 'Link',
        lastName: 'Er',
      });
    });

    it('401s without a token', async () => {
      expect((await list('')).status).toBe(401);
    });

    it('reports a password-only account with no linked providers', async () => {
      const res = await list(await token());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ hasPassword: true, identities: [] });
    });

    it('lists a linked provider, then disconnects it', async () => {
      const accessToken = await token();
      const me = (await (
        await fetch(`${authBaseUrl}/me`, {
          headers: { authorization: `Bearer ${accessToken}` },
        })
      ).json()) as any;

      await app.get(IdentityService).link({
        userId: me.id,
        provider: 'google',
        subject: `sub-${me.id}`,
        email: 'linker@gmail.com',
      });

      const listed = (await (await list(accessToken)).json()) as any;
      expect(listed.hasPassword).toBe(true);
      expect(listed.identities).toEqual([
        {
          provider: 'google',
          // no provider configured → the title-cased id is the fallback label
          label: 'Google',
          email: 'linker@gmail.com',
          linkedAt: expect.any(String),
        },
      ]);

      const del = await fetch(`${authBaseUrl}/identities/google`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${accessToken}` },
      });
      expect(del.status).toBe(204);

      const after = (await (await list(accessToken)).json()) as any;
      expect(after.identities).toEqual([]);
    });

    it('404s when disconnecting a provider that is not linked', async () => {
      const del = await fetch(`${authBaseUrl}/identities/keycloak`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${await token()}` },
      });
      expect(del.status).toBe(404);
      expect(((await del.json()) as any).code).toBe('IDENTITY_NOT_FOUND');
    });
  });

  describe('two-factor (2FA / TOTP)', () => {
    const tfaUser = {
      email: 'tfa@example.com',
      password: 'Str0ng!Passw0rd',
    };
    let secret: string;
    let backupCodes: string[];

    const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

    const post = (
      path: string,
      body: unknown,
      headers: Record<string, string> = {},
    ) =>
      fetch(`${authBaseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });

    const challenge = async () => {
      const res = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tfaUser),
      });
      return { res, body: (await res.json()) as any };
    };

    beforeAll(async () => {
      await app
        .get(UserService)
        .create({ ...tfaUser, firstName: 'Two', lastName: 'Factor' });
    });

    it('enrolls: setup returns a QR, confirm returns backup codes', async () => {
      const { body: creds } = await login(tfaUser);

      const setup = await post('/2fa/setup', {}, bearer(creds.accessToken));
      expect(setup.status).toBe(201);
      const setupBody = (await setup.json()) as any;
      expect(setupBody.qrDataUri).toMatch(/^data:image\/png;base64,/);
      expect(setupBody.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
      secret = setupBody.secret;

      const confirm = await post(
        '/2fa/confirm',
        { code: generateTotp(secret) },
        bearer(creds.accessToken),
      );
      expect(confirm.status).toBe(201);
      backupCodes = ((await confirm.json()) as any).backupCodes;
      expect(backupCodes).toHaveLength(10);
    });

    it('login now returns a challenge and sets no session cookie', async () => {
      const { res, body } = await challenge();

      expect(res.status).toBe(201);
      expect(body).toEqual({
        twoFactorRequired: true,
        pendingToken: expect.any(String),
        expiresIn: expect.any(Number),
      });
      expect(
        res.headers.getSetCookie().some((c) => c.startsWith('refresh_token=')),
      ).toBe(false);
    });

    it('a pending_2fa token is rejected on a normal protected route', async () => {
      const { body } = await challenge();
      const me = await fetch(`${authBaseUrl}/me`, {
        headers: bearer(body.pendingToken),
      });
      expect(me.status).toBe(401);
    });

    it('rejects /2fa/verify with a wrong code (401)', async () => {
      const { body } = await challenge();
      const res = await post('/2fa/verify', {
        pendingToken: body.pendingToken,
        code: '000000',
      });
      expect(res.status).toBe(401);
      expect(((await res.json()) as any).code).toBe('TWO_FACTOR_INVALID');
    });

    it('completes the login with a valid TOTP code', async () => {
      const { body } = await challenge();
      const res = await post('/2fa/verify', {
        pendingToken: body.pendingToken,
        code: generateTotp(secret),
      });

      expect(res.status).toBe(201);
      const session = (await res.json()) as any;
      expect(typeof session.accessToken).toBe('string');
      expect(session.user).toEqual({ id: expect.any(String), roles: [] });
      expect(
        res.headers.getSetCookie().some((c) => c.startsWith('refresh_token=')),
      ).toBe(true);
    });

    it('accepts a backup code exactly once', async () => {
      const first = await challenge();
      const ok = await post('/2fa/verify', {
        pendingToken: first.body.pendingToken,
        code: backupCodes[0],
      });
      expect(ok.status).toBe(201);

      const second = await challenge();
      const reused = await post('/2fa/verify', {
        pendingToken: second.body.pendingToken,
        code: backupCodes[0],
      });
      expect(reused.status).toBe(401);
    });

    it('disables 2FA (wrong password 400, right password 204) and stops challenging', async () => {
      const { body: pending } = await challenge();
      const session = (await (
        await post('/2fa/verify', {
          pendingToken: pending.pendingToken,
          code: generateTotp(secret),
        })
      ).json()) as any;

      const wrong = await post(
        '/2fa/disable',
        { password: 'nope' },
        bearer(session.accessToken),
      );
      expect(wrong.status).toBe(400);

      const disabled = await post(
        '/2fa/disable',
        { password: tfaUser.password },
        bearer(session.accessToken),
      );
      expect(disabled.status).toBe(204);

      const after = await challenge();
      expect(typeof after.body.accessToken).toBe('string');
      expect(after.body.twoFactorRequired).toBeUndefined();
    });
  });

  describe('admin console — disable an account', () => {
    const cookie = (response: Response, name: string): string => {
      const line = response.headers
        .getSetCookie()
        .find((c) => c.startsWith(`${name}=`));
      return line ? line.slice(name.length + 1).split(';')[0] : '';
    };

    it('a disabled account cannot login or refresh (403 ACCOUNT_DISABLED)', async () => {
      const email = 'to-be-disabled@example.com';
      const password = 'Str0ng!Passw0rd';
      const created = await app
        .get(UserService)
        .create({ email, password, firstName: 'Dis', lastName: 'Abled' });

      // open a session, then have an admin disable the account
      const session = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const refresh = cookie(session, 'refresh_token');
      const csrf = cookie(session, 'csrf-token');

      const { body: adminBody } = await login(adminCredentials);
      const disable = await fetch(
        `${usersBaseUrl}/${created._id.toString()}/status`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${adminBody.accessToken}`,
          },
          body: JSON.stringify({ active: false }),
        },
      );
      expect(disable.status).toBe(200);

      // refresh is refused
      const refreshRes = await fetch(`${authBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          cookie: `refresh_token=${refresh}; csrf-token=${csrf}`,
          'x-csrf-token': csrf,
        },
      });
      expect(refreshRes.status).toBe(403);
      expect(((await refreshRes.json()) as any).code).toBe('ACCOUNT_DISABLED');

      // and so is a fresh login
      const relogin = await fetch(`${authBaseUrl}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      expect(relogin.status).toBe(403);
      expect(((await relogin.json()) as any).code).toBe('ACCOUNT_DISABLED');
    });
  });
});
