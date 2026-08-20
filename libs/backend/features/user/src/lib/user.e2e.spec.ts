import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken, MongooseModule } from '@nestjs/mongoose';
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

  async function createUser(payload = validPayload) {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { response, body: await response.json() };
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

  it('lists users', async () => {
    await createUser();
    await createUser({ ...validPayload, email: 'other@example.com' });

    const response = await fetch(baseUrl);

    expect(response.status).toBe(200);
    expect(await response.json()).toHaveLength(2);
  });

  it('updates a user', async () => {
    const { body: created } = await createUser();

    const response = await fetch(`${baseUrl}/${created._id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Janet' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
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
    const response = await fetch(
      `${baseUrl}/${nonExistentObjectId()}`,
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('USER_NOT_FOUND');
  });

  it('returns 404 (not a raw Mongoose error) for a malformed id', async () => {
    const response = await fetch(`${baseUrl}/not-a-valid-object-id`);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe('USER_NOT_FOUND');
  });

  it('rejects an invalid payload with 400', async () => {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', firstName: '', lastName: 'Doe' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
