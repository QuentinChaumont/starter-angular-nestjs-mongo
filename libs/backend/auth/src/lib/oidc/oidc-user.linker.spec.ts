import { buildTestConfig } from '@org/backend-testing';
import type { UserService } from '@org/backend-features-user';
import { OidcClaims } from './oidc-claims';
import { OidcUserLinker } from './oidc-user.linker';

const OIDC_ENV = {
  OIDC_ISSUER: 'https://idp.example',
  OIDC_CLIENT_ID: 'client-1',
  OIDC_REDIRECT_URI: 'https://api.example/api/auth/oidc/callback',
};

interface FakeUser {
  _id: { toString(): string };
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  password: string;
}

class FakeUserService {
  users: FakeUser[] = [];
  private seq = 0;

  async findByEmail(email: string): Promise<FakeUser | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async create(input: Omit<FakeUser, '_id'>): Promise<FakeUser> {
    const id = String(++this.seq);
    const user: FakeUser = { ...input, _id: { toString: () => id } };
    this.users.push(user);
    return user;
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
} {
  const users = new FakeUserService();
  const linker = new OidcUserLinker(
    users as unknown as UserService,
    buildTestConfig({ ...OIDC_ENV, ...envOverrides }),
  );
  return { linker, users };
}

describe('OidcUserLinker', () => {
  it('reuses an existing account with the same email', async () => {
    const { linker, users } = buildLinker();
    users.users.push({
      _id: { toString: () => 'existing' },
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      roles: ['admin'],
      password: 'x',
    });

    const result = await linker.linkFromClaims('generic', claims());

    expect(result).toEqual({ id: 'existing', roles: ['admin'] });
    expect(users.users).toHaveLength(1);
  });

  it('creates a passwordless account from the claims when none exists', async () => {
    const { linker, users } = buildLinker({ OIDC_ROLES_CLAIM: 'roles' });

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
    expect(users.users[0].password).toEqual(expect.any(String));
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
