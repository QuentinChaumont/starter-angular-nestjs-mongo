import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import {
  AppConfigModule,
  AppHttpModule,
  GlobalExceptionFilter,
  LoggerModule,
  createValidationPipe,
  useRequestIdMiddleware,
} from '@org/backend-core';
import {
  listenOnRandomPort,
  nonExistentObjectId,
  startTestMongo,
  TestMongo,
} from '@org/backend-testing';
import type { Connection, Model } from 'mongoose';
import { User } from './user.schema';
import { UserModule } from './user.module';

describe('User CRUD (e2e, real Mongo instance)', () => {
  let testMongo: TestMongo;
  let app: INestApplication;
  let baseUrl: string;
  let connection: Connection;

  beforeAll(async () => {
    testMongo = await startTestMongo();

    @Module({
      imports: [
        AppConfigModule,
        LoggerModule,
        AppHttpModule,
        MongooseModule.forRoot(testMongo.mongod.getUri()),
        UserModule,
      ],
    })
    class TestAppModule {}

    app = await NestFactory.create(TestAppModule, { logger: false });
    useRequestIdMiddleware(app);
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalPipes(createValidationPipe());
    baseUrl = `${await listenOnRandomPort(app)}/users`;

    connection = app.get<Connection>(getConnectionToken());
    await app.get<Model<User>>(getModelToken(User.name)).syncIndexes();
  }, 60_000);

  afterEach(async () => {
    await connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
    await testMongo.mongod.stop();
  });

  const validPayload = {
    email: 'jane.doe@example.com',
    password: 'Str0ng!Passw0rd',
    firstName: 'Jane',
    lastName: 'Doe',
  };
  const publicFields = {
    email: validPayload.email,
    firstName: validPayload.firstName,
    lastName: validPayload.lastName,
  };

  async function createUser(payload: Record<string, unknown> = validPayload) {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { response, body: (await response.json()) as any };
  }

  it('creates a user', async () => {
    const { response, body } = await createUser();

    expect(response.status).toBe(201);
    expect(body).toMatchObject(publicFields);
    expect(body._id).toBeDefined();
    expect(body.password).toBeUndefined();
  });

  it('reads a user by id', async () => {
    const { body: created } = await createUser();

    const response = await fetch(`${baseUrl}/${created._id}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject(publicFields);
  });

  it('lists users, paginated and newest-first', async () => {
    await createUser();
    await createUser({ ...validPayload, email: 'other@example.com' });

    const response = await fetch(`${baseUrl}?page=1&pageSize=1`);
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(body.items).toHaveLength(1);
    expect(body.items[0].email).toBe('other@example.com'); // newest first
    expect(body.items[0]).toHaveProperty('disabledAt', null);
  });

  it('searches users by email / name', async () => {
    await createUser();
    await createUser({
      ...validPayload,
      email: 'zoe@example.com',
      firstName: 'Zoe',
    });

    const body: any = await (await fetch(`${baseUrl}?search=zoe`)).json();
    expect(body.total).toBe(1);
    expect(body.items[0].email).toBe('zoe@example.com');
  });

  it('filters per column (contains, case-insensitive) and sorts', async () => {
    await createUser({
      ...validPayload,
      email: 'ana@example.com',
      lastName: 'Zephyr',
    });
    await createUser({
      ...validPayload,
      email: 'bea@example.com',
      lastName: 'Adams',
    });
    await createUser({
      ...validPayload,
      email: 'cid@other.test',
      lastName: 'Marsh',
    });

    const byEmail: any = await (await fetch(`${baseUrl}?email=EXAMPLE`)).json();
    expect(byEmail.total).toBe(2);

    const byName: any = await (await fetch(`${baseUrl}?name=adam`)).json();
    expect(byName.total).toBe(1);
    expect(byName.items[0].email).toBe('bea@example.com');

    const sorted: any = await (
      await fetch(`${baseUrl}?sort=email&dir=asc`)
    ).json();
    expect(sorted.items.map((u: any) => u.email)).toEqual([
      'ana@example.com',
      'bea@example.com',
      'cid@other.test',
    ]);
  });

  it('sets roles but refuses to drop the last admin', async () => {
    const { body: admin } = await createUser({
      ...validPayload,
      email: 'boss@example.com',
      roles: ['admin'],
    });

    const strip = () =>
      fetch(`${baseUrl}/${admin._id}/roles`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roles: [] }),
      });

    const refused = await strip();
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as any).code).toBe('LAST_ADMIN');

    // a second admin lifts the guard
    await createUser({
      ...validPayload,
      email: 'boss2@example.com',
      roles: ['admin'],
    });
    const ok = await strip();
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as any).roles).toEqual([]);
  });

  it('disables and re-enables an account', async () => {
    const { body: user } = await createUser();

    const setStatus = (active: boolean) =>
      fetch(`${baseUrl}/${user._id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active }),
      });

    const disabled: any = await (await setStatus(false)).json();
    expect(typeof disabled.disabledAt).toBe('string');

    const enabled: any = await (await setStatus(true)).json();
    expect(enabled.disabledAt).toBeNull();
  });

  it('updates a user', async () => {
    const { body: created } = await createUser();

    const response = await fetch(`${baseUrl}/${created._id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Janet' }),
    });

    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.firstName).toBe('Janet');
    expect(body.lastName).toBe(validPayload.lastName);
  });

  it('deletes a user', async () => {
    const { body: created } = await createUser();

    const deleteResponse = await fetch(`${baseUrl}/${created._id}`, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(200);

    const getResponse = await fetch(`${baseUrl}/${created._id}`);
    expect(getResponse.status).toBe(404);
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser();

    const { response, body } = await createUser();

    expect(response.status).toBe(409);
    expect(body.code).toBe('USER_EMAIL_ALREADY_EXISTS');
  });

  it('returns 404 for an unknown user', async () => {
    const response = await fetch(`${baseUrl}/${nonExistentObjectId()}`);

    expect(response.status).toBe(404);
    const body: any = await response.json();
    expect(body.code).toBe('USER_NOT_FOUND');
  });

  it('returns 404 (not a raw Mongoose error) for a malformed id', async () => {
    const response = await fetch(`${baseUrl}/not-a-valid-object-id`);

    expect(response.status).toBe(404);
    const body: any = await response.json();
    expect(body.code).toBe('USER_NOT_FOUND');
  });

  it('rejects an invalid payload with 400', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        firstName: '',
        lastName: 'Doe',
      }),
    });

    expect(response.status).toBe(400);
    const body: any = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
