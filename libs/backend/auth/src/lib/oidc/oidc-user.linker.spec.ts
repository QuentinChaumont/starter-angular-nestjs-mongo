import { buildTestConfig } from '@org/backend-testing';
import type { UserService } from '@org/backend-features-user';
import type { IdentityService } from '../identity/identity.service';
import { OidcClaims } from './oidc-claims';
import { OidcUserLinker } from './oidc-user.linker';

const OIDC_ENV = {
  OIDC_ISSUER: 'https://idp.example',
  OIDC_CLIENT_ID: 'client-1',
  OIDC_REDIRECT_URI: 'https://api.example/api/auth/oidc/generic/callback',
};

interface FakeUser {
  _id: { toString(): string };
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

interface FakeIdentity {
  userId: string;
  provider: string;
  subject: string;
  email?: string;
}

class FakeUserService {
  users: FakeUser[] = [];
  private seq = 0;

  async findByEmail(email: string): Promise<FakeUser | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<FakeUser> {
    const found = this.users.find((u) => u._id.toString() === id);
    if (!found) {
      throw new Error('USER_NOT_FOUND');
    }
    return found;
  }

  async create(input: Omit<FakeUser, '_id'>): Promise<FakeUser> {
    const id = String(++this.seq);
    const user: FakeUser = { ...input, _id: { toString: () => id } };
    this.users.push(user);
    return user;
  }
}

class FakeIdentityService {
  identities: FakeIdentity[] = [];

  async find(provider: string, subject: string): Promise<FakeIdentity | null> {
    return (
      this.identities.find(
        (i) => i.provider === provider && i.subject === subject,
      ) ?? null
    );
  }

  async link(input: FakeIdentity): Promise<FakeIdentity> {
    const existing = await this.find(input.provider, input.subject);
    if (existing) {
      if (existing.userId !== input.userId) {
        throw Object.assign(new Error('IDENTITY_ALREADY_LINKED'), {
          code: 'IDENTITY_ALREADY_LINKED',
        });
      }
      return existing;
    }
    this.identities.push(input);
    return input;
  }
}

function claims(overrides: Partial<OidcClaims> = {}): OidcClaims {
  return {
    sub: 'sub-1',
    email: 'jane@example.com',
    emailVerified: true,
    raw: {},
    ...overrides,
  };
}

function buildLinker(envOverrides: Record<string, unknown> = {}): {
  linker: OidcUserLinker;
  users: FakeUserService;
  identities: FakeIdentityService;
} {
  const users = new FakeUserService();
  const identities = new FakeIdentityService();
  const linker = new OidcUserLinker(
    users as unknown as UserService,
    identities as unknown as IdentityService,
    buildTestConfig({ ...OIDC_ENV, ...envOverrides }),
  );
  return { linker, users, identities };
}

describe('OidcUserLinker', () => {
  describe('linkFromClaims', () => {
    it('reuses the account behind an existing (provider, subject) identity', async () => {
      const { linker, users, identities } = buildLinker();
      users.users.push({
        _id: { toString: () => 'existing' },
        email: 'someone.else@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roles: ['admin'],
      });
      identities.identities.push({
        userId: 'existing',
        provider: 'generic',
        subject: 'sub-1',
      });

      const result = await linker.linkFromClaims('generic', claims());

      expect(result).toEqual({ id: 'existing', roles: ['admin'] });
      expect(users.users).toHaveLength(1);
    });

    it('links a new identity to an existing account with the same verified email', async () => {
      const { linker, users, identities } = buildLinker();
      users.users.push({
        _id: { toString: () => 'existing' },
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roles: ['admin'],
      });

      const result = await linker.linkFromClaims('generic', claims());

      expect(result).toEqual({ id: 'existing', roles: ['admin'] });
      expect(users.users).toHaveLength(1);
      expect(identities.identities).toEqual([
        {
          userId: 'existing',
          provider: 'generic',
          subject: 'sub-1',
          email: 'jane@example.com',
        },
      ]);
    });

    it('creates a passwordless account + its identity when none exists', async () => {
      const { linker, users, identities } = buildLinker({
        OIDC_ROLES_CLAIM: 'roles',
      });

      const result = await linker.linkFromClaims(
        'generic',
        claims({
          givenName: 'Jane',
          familyName: 'Doe',
          raw: { roles: ['editor'] },
        }),
      );

      expect(users.users).toHaveLength(1);
      expect(users.users[0]).toMatchObject({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roles: ['editor'],
      });
      expect(users.users[0]).not.toHaveProperty('password');
      expect(identities.identities).toHaveLength(1);
      expect(identities.identities[0]).toMatchObject({
        userId: '1',
        provider: 'generic',
        subject: 'sub-1',
      });
      expect(result).toEqual({ id: '1', roles: ['editor'] });
    });

    it('derives names from a single "name" claim', async () => {
      const { linker, users } = buildLinker();

      await linker.linkFromClaims('generic', claims({ name: 'Ada Lovelace' }));

      expect(users.users[0]).toMatchObject({
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    });

    it('rejects an unverified email by default', async () => {
      const { linker } = buildLinker();

      await expect(
        linker.linkFromClaims('generic', claims({ emailVerified: false })),
      ).rejects.toThrow(/not verified/i);
    });

    it('accepts an unverified email when OIDC_REQUIRE_VERIFIED_EMAIL=false', async () => {
      const { linker, users } = buildLinker({
        OIDC_REQUIRE_VERIFIED_EMAIL: false,
      });

      await linker.linkFromClaims('generic', claims({ emailVerified: false }));

      expect(users.users).toHaveLength(1);
    });

    it('rejects claims without an email', async () => {
      const { linker } = buildLinker();

      await expect(
        linker.linkFromClaims('generic', claims({ email: undefined })),
      ).rejects.toThrow(/did not return an email/i);
    });

    it('rejects an unknown provider id', async () => {
      const { linker } = buildLinker();

      await expect(linker.linkFromClaims('nope', claims())).rejects.toThrow(
        /OIDC provider "nope"/,
      );
    });
  });

  describe('linkToUser', () => {
    it('records an identity for an already-authenticated account', async () => {
      const { linker, identities } = buildLinker();

      await linker.linkToUser('generic', claims(), 'current-user');

      expect(identities.identities).toEqual([
        {
          userId: 'current-user',
          provider: 'generic',
          subject: 'sub-1',
          email: 'jane@example.com',
        },
      ]);
    });

    it('propagates IDENTITY_ALREADY_LINKED when the identity belongs elsewhere', async () => {
      const { linker, identities } = buildLinker();
      identities.identities.push({
        userId: 'other-user',
        provider: 'generic',
        subject: 'sub-1',
      });

      await expect(
        linker.linkToUser('generic', claims(), 'current-user'),
      ).rejects.toThrow(/IDENTITY_ALREADY_LINKED/);
    });

    it('rejects an unverified email', async () => {
      const { linker } = buildLinker();

      await expect(
        linker.linkToUser('generic', claims({ emailVerified: false }), 'u1'),
      ).rejects.toThrow(/not verified/i);
    });
  });
});
