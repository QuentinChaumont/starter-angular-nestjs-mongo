import { INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import {
  AppConfigModule,
  AppHttpModule,
  GlobalExceptionFilter,
  LoggerModule,
  createValidationPipe,
  useRequestIdMiddleware,
} from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import {
  listenOnRandomPort,
  startTestMongo,
  TestMongo,
} from '@org/backend-testing';
import type { Connection } from 'mongoose';
import { RoleModule } from './role.module';

describe('Role CRUD (e2e, real Mongo instance)', () => {
  let testMongo: TestMongo;
  let app: INestApplication;
  let rolesUrl: string;
  let usersUrl: string;
  let connection: Connection;

  beforeAll(async () => {
    testMongo = await startTestMongo();

    @Module({
      imports: [
        AppConfigModule,
        LoggerModule,
        AppHttpModule,
        MongooseModule.forRoot(testMongo.mongod.getUri()),
        RoleModule,
      ],
    })
    class TestAppModule {}

    app = await NestFactory.create(TestAppModule, { logger: false });
    useRequestIdMiddleware(app);
    app.useGlobalFilters(app.get(GlobalExceptionFilter));
    app.useGlobalPipes(createValidationPipe());
    const base = await listenOnRandomPort(app);
    rolesUrl = `${base}/roles`;
    usersUrl = `${base}/users`;
    connection = app.get<Connection>(getConnectionToken());
  }, 60_000);

  afterEach(async () => {
    // keep the seeded system role, drop everything else
    await connection.collection('roles').deleteMany({ system: { $ne: true } });
    await connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
    await testMongo.mongod.stop();
  });

  const post = (url: string, body: unknown) =>
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('seeds the protected "admin" system role on bootstrap', async () => {
    const res = await fetch(`${rolesUrl}?search=admin`);
    const body = (await res.json()) as any;
    const admin = body.items.find((r: any) => r.name === 'admin');
    expect(admin).toMatchObject({ name: 'admin', system: true });
  });

  it('creates, lists, updates and deletes a role', async () => {
    const created = (await (
      await post(rolesUrl, { name: 'Editor', description: 'Publishes' })
    ).json()) as any;
    expect(created).toMatchObject({
      name: 'editor', // normalised
      description: 'Publishes',
      system: false,
    });

    const patched = await fetch(`${rolesUrl}/${created.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description: 'Publishes content' }),
    });
    expect(((await patched.json()) as any).description).toBe(
      'Publishes content',
    );

    const del = await fetch(`${rolesUrl}/${created.id}`, { method: 'DELETE' });
    expect(del.status).toBe(204);
  });

  it('rejects a duplicate role name (409)', async () => {
    await post(rolesUrl, { name: 'editor' });
    const dupe = await post(rolesUrl, { name: 'Editor' });
    expect(dupe.status).toBe(409);
    expect(((await dupe.json()) as any).code).toBe('ROLE_ALREADY_EXISTS');
  });

  it('refuses to rename or delete a system role (409)', async () => {
    const admin = (await (await fetch(`${rolesUrl}?search=admin`)).json()) as any;
    const id = admin.items.find((r: any) => r.name === 'admin').id;

    const rename = await fetch(`${rolesUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'superadmin' }),
    });
    expect(rename.status).toBe(409);
    expect(((await rename.json()) as any).code).toBe('ROLE_SYSTEM_PROTECTED');

    const del = await fetch(`${rolesUrl}/${id}`, { method: 'DELETE' });
    expect(del.status).toBe(409);
  });

  it('refuses to delete a role still assigned to a user (409 ROLE_IN_USE)', async () => {
    const role = (await (await post(rolesUrl, { name: 'auditor' })).json()) as any;
    await app.get(UserService).create({
      email: 'a@example.com',
      password: 'Str0ng!Passw0rd',
      firstName: 'A',
      lastName: 'A',
      roles: ['auditor'],
    });

    const del = await fetch(`${rolesUrl}/${role.id}`, { method: 'DELETE' });
    expect(del.status).toBe(409);
    expect(((await del.json()) as any).code).toBe('ROLE_IN_USE');
  });

  it('validates role names when assigning them to a user (400 UNKNOWN_ROLE)', async () => {
    const user = await app.get(UserService).create({
      email: 'b@example.com',
      password: 'Str0ng!Passw0rd',
      firstName: 'B',
      lastName: 'B',
    });

    const res = await fetch(`${usersUrl}/${user._id.toString()}/roles`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roles: ['ghost'] }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).code).toBe('UNKNOWN_ROLE');

    // a real role goes through
    await post(rolesUrl, { name: 'ghost' });
    const ok = await fetch(`${usersUrl}/${user._id.toString()}/roles`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roles: ['ghost'] }),
    });
    expect(ok.status).toBe(200);
  });
});
