import { buildTestConfig } from '@org/backend-testing';
import { hashToken } from './opaque-token';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RefreshTokenService } from './refresh-token.service';

interface Row {
  id: string;
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByHash?: string;
  userAgent?: string;
  ip?: string;
}

class FakeRefreshTokenRepository {
  rows: Row[] = [];
  private seq = 0;

  async create(input: Omit<Row, 'id'>): Promise<Row> {
    const row: Row = { ...input, id: String(++this.seq) };
    this.rows.push(row);
    return row;
  }

  async findByHash(tokenHash: string): Promise<Row | null> {
    return this.rows.find((r) => r.tokenHash === tokenHash) ?? null;
  }

  async markRotated(id: string, replacedByHash: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (row) {
      row.revokedAt = new Date();
      row.replacedByHash = replacedByHash;
    }
  }

  async revokeById(id: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (row && !row.revokedAt) {
      row.revokedAt = new Date();
    }
  }

  async revokeFamily(family: string): Promise<void> {
    for (const row of this.rows) {
      if (row.family === family && !row.revokedAt) {
        row.revokedAt = new Date();
      }
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const row of this.rows) {
      if (row.userId === userId && !row.revokedAt) {
        row.revokedAt = new Date();
      }
    }
  }

  async deleteExpiredForUser(userId: string): Promise<void> {
    this.rows = this.rows.filter(
      (r) => !(r.userId === userId && r.expiresAt.getTime() < Date.now()),
    );
  }
}

function buildService(): {
  service: RefreshTokenService;
  repo: FakeRefreshTokenRepository;
} {
  const repo = new FakeRefreshTokenRepository();
  const service = new RefreshTokenService(
    repo as unknown as RefreshTokenRepository,
    buildTestConfig({ REFRESH_EXPIRES_IN: '30d' }),
  );
  return { service, repo };
}

describe('RefreshTokenService', () => {
  it('issues a stored, hashed token with a future expiry', async () => {
    const { service, repo } = buildService();

    const issued = await service.issue('user-1', { ip: '127.0.0.1' });

    expect(issued.token).toMatch(/^[0-9a-f]{64}$/);
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].tokenHash).toBe(hashToken(issued.token));
    expect(repo.rows[0].tokenHash).not.toBe(issued.token);
    expect(repo.rows[0].ip).toBe('127.0.0.1');
  });

  it('rotates a valid token: old one revoked and linked to the new one', async () => {
    const { service, repo } = buildService();
    const first = await service.issue('user-1');

    const { userId, issued } = await service.rotate(first.token);

    expect(userId).toBe('user-1');
    expect(issued.token).not.toBe(first.token);
    expect(issued.family).toBe(first.family);
    const oldRow = repo.rows.find((r) => r.tokenHash === hashToken(first.token));
    expect(oldRow?.revokedAt).toBeInstanceOf(Date);
    expect(oldRow?.replacedByHash).toBe(hashToken(issued.token));
  });

  it('rejects an unknown token', async () => {
    const { service } = buildService();

    await expect(service.rotate('nope')).rejects.toThrow(/Invalid refresh token/);
  });

  it('treats reuse of an already-rotated token as a breach and kills the family', async () => {
    const { service, repo } = buildService();
    const first = await service.issue('user-1');
    await service.rotate(first.token);

    await expect(service.rotate(first.token)).rejects.toThrow(
      /already been used/,
    );
    expect(repo.rows.every((r) => r.revokedAt)).toBe(true);
  });

  it('rejects an expired token', async () => {
    const { service, repo } = buildService();
    const first = await service.issue('user-1');
    repo.rows[0].expiresAt = new Date(Date.now() - 1_000);

    await expect(service.rotate(first.token)).rejects.toThrow(/has expired/);
  });

  it('revoke is idempotent and never throws on an unknown token', async () => {
    const { service, repo } = buildService();
    const first = await service.issue('user-1');

    await service.revoke(first.token);
    await service.revoke(first.token);
    await service.revoke('unknown');

    expect(repo.rows[0].revokedAt).toBeInstanceOf(Date);
  });

  it('revokes every active token for a user', async () => {
    const { service, repo } = buildService();
    await service.issue('user-1');
    await service.issue('user-1');
    await service.issue('user-2');

    await service.revokeAllForUser('user-1');

    expect(repo.rows.filter((r) => r.userId === 'user-1' && r.revokedAt)).toHaveLength(2);
    expect(repo.rows.find((r) => r.userId === 'user-2')?.revokedAt).toBeUndefined();
  });
});
