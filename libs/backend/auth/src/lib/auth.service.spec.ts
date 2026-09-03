import { JwtService } from '@nestjs/jwt';
import { ApplicationError, hashPassword } from '@org/backend-core';
import { buildTestConfig } from '@org/backend-testing';
import { AuthEvents } from './auth-events';
import { AuthService } from './auth.service';
import type { RefreshTokenService } from './refresh/refresh-token.service';
import type { UserService } from '@org/backend-features-user';

const issued = {
  token: 'raw-refresh',
  expiresAt: new Date(Date.now() + 60_000),
  family: 'fam',
};

function build(overrides: {
  requireVerifiedEmail?: boolean;
  user?: Record<string, unknown> | null;
}) {
  const users = {
    findByEmailWithPassword: jest.fn().mockResolvedValue(overrides.user),
    create: jest.fn(),
    // `issueSession` re-loads the account to check the 2FA flag.
    findById: jest.fn().mockResolvedValue(overrides.user ?? { roles: [] }),
  } as unknown as UserService;
  const refreshTokens = {
    issue: jest.fn().mockResolvedValue(issued),
  } as unknown as RefreshTokenService;
  const events = new AuthEvents();
  const config = buildTestConfig({
    JWT_SECRET: 'test-secret',
    ...(overrides.requireVerifiedEmail
      ? { AUTH_REQUIRE_VERIFIED_EMAIL: true }
      : {}),
  });
  const service = new AuthService(
    users,
    new JwtService({ secret: 'test-secret' }),
    refreshTokens,
    config,
    events,
  );
  return { service, users, events };
}

describe('AuthService', () => {
  const password = 'Str0ng!Passw0rd';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(password);
  });

  describe('the verified-email login gate', () => {
    it('blocks an unverified account with 403 EMAIL_NOT_VERIFIED', async () => {
      const { service } = build({
        requireVerifiedEmail: true,
        user: { _id: 'u1', roles: [], password: passwordHash },
      });

      await expect(service.login('a@b.test', password)).rejects.toMatchObject({
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
      });
    });

    it('lets a verified account through', async () => {
      const { service } = build({
        requireVerifiedEmail: true,
        user: {
          _id: 'u1',
          roles: [],
          password: passwordHash,
          emailVerifiedAt: new Date(),
        },
      });

      await expect(service.login('a@b.test', password)).resolves.toMatchObject({
        user: { id: 'u1', roles: [] },
      });
    });

    it('ignores verification when the flag is off (default)', async () => {
      const { service } = build({
        user: { _id: 'u1', roles: [], password: passwordHash },
      });

      await expect(
        service.login('a@b.test', password),
      ).resolves.toBeDefined();
    });

    it('still rejects a wrong password before the gate', async () => {
      const { service } = build({
        requireVerifiedEmail: true,
        user: { _id: 'u1', roles: [], password: passwordHash },
      });

      await expect(service.login('a@b.test', 'wrong')).rejects.toBeInstanceOf(
        ApplicationError,
      );
    });
  });

  it('emits user.registered after creating the account', async () => {
    const { service, users, events } = build({ user: null });
    (users.create as jest.Mock).mockResolvedValue({
      _id: 'new-id',
      email: 'new@b.test',
      firstName: 'New',
      roles: [],
    });
    const listener = jest.fn();
    events.onUserRegistered(listener);

    await service.register({
      email: 'new@b.test',
      password,
      firstName: 'New',
      lastName: 'Comer',
    });

    expect(listener).toHaveBeenCalledWith({
      userId: 'new-id',
      email: 'new@b.test',
      firstName: 'New',
    });
  });
});
