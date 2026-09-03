import { AuthEvents } from '../auth-events';
import type { IdentityRepository } from './identity.repository';
import { IdentityDocument } from './identity.schema';
import { IdentityService } from './identity.service';

interface Row {
  userId: string;
  provider: string;
  subject: string;
  email?: string;
  linkedAt: Date;
}

class FakeIdentityRepository {
  rows: Row[] = [];

  async findByProviderSubject(provider: string, subject: string) {
    return (
      this.rows.find(
        (r) => r.provider === provider && r.subject === subject,
      ) ?? null
    );
  }

  async findForUser(userId: string) {
    return this.rows.filter((r) => r.userId === userId);
  }

  async countForUser(userId: string) {
    return this.rows.filter((r) => r.userId === userId).length;
  }

  async create(input: Omit<Row, 'linkedAt'>) {
    const row: Row = { ...input, linkedAt: new Date() };
    this.rows.push(row);
    return row;
  }

  async deleteForUserProvider(userId: string, provider: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter(
      (r) => !(r.userId === userId && r.provider === provider),
    );
    return this.rows.length < before;
  }
}

function build(): { service: IdentityService; repo: FakeIdentityRepository } {
  const repo = new FakeIdentityRepository();
  const service = new IdentityService(
    repo as unknown as IdentityRepository,
    new AuthEvents(),
  );
  return { service, repo };
}

const link = { userId: 'u1', provider: 'google', subject: 'g-1' };

describe('IdentityService', () => {
  describe('link', () => {
    it('creates a new identity row', async () => {
      const { service, repo } = build();

      await service.link({ ...link, email: 'a@example.com' });

      expect(repo.rows).toHaveLength(1);
      expect(repo.rows[0]).toMatchObject({ ...link, email: 'a@example.com' });
    });

    it('is idempotent for the same (provider, subject) + user', async () => {
      const { service, repo } = build();

      await service.link(link);
      await service.link(link);

      expect(repo.rows).toHaveLength(1);
    });

    it('409s when the identity is already linked to another user', async () => {
      const { service } = build();
      await service.link(link);

      await expect(
        service.link({ ...link, userId: 'someone-else' }),
      ).rejects.toMatchObject({ code: 'IDENTITY_ALREADY_LINKED' });
    });
  });

  describe('unlink', () => {
    it('removes the identity when a local password remains', async () => {
      const { service, repo } = build();
      await service.link(link);

      await service.unlink('u1', 'google', { hasPassword: true });

      expect(repo.rows).toHaveLength(0);
    });

    it('removes the identity when another identity remains', async () => {
      const { service, repo } = build();
      await service.link(link);
      await service.link({ userId: 'u1', provider: 'keycloak', subject: 'k-1' });

      await service.unlink('u1', 'google', { hasPassword: false });

      expect(repo.rows.map((r) => r.provider)).toEqual(['keycloak']);
    });

    it('409s when it is the last way to sign in', async () => {
      const { service } = build();
      await service.link(link);

      await expect(
        service.unlink('u1', 'google', { hasPassword: false }),
      ).rejects.toMatchObject({ code: 'LAST_LOGIN_METHOD' });
    });

    it('404s when the provider is not linked', async () => {
      const { service } = build();

      await expect(
        service.unlink('u1', 'google', { hasPassword: true }),
      ).rejects.toMatchObject({ code: 'IDENTITY_NOT_FOUND' });
    });
  });

  describe('listForUser', () => {
    it("returns the user's identities", async () => {
      const { service } = build();
      await service.link(link);
      await service.link({ userId: 'other', provider: 'google', subject: 'g-2' });

      const rows = (await service.listForUser('u1')) as IdentityDocument[];

      expect(rows).toHaveLength(1);
      expect(rows[0].provider).toBe('google');
    });
  });
});
