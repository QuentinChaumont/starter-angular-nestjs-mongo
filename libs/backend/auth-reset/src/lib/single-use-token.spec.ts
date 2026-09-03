import { ApplicationError } from '@org/backend-core';
import {
  SingleUseTokenFields,
  SingleUseTokenPurpose,
  SingleUseTokenService,
} from './single-use-token';
import type { SingleUseTokenRepository } from './single-use-token.repository';

interface Row extends SingleUseTokenFields {
  id: string;
  createdAt: Date;
}

/** In-memory stand-in for the Mongo-backed repository. */
class FakeRepo {
  rows: Row[] = [];
  private seq = 0;

  async create(input: {
    userId: string;
    purpose: SingleUseTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Row> {
    const row: Row = {
      id: `row-${this.seq++}`,
      createdAt: new Date(),
      ...input,
    };
    this.rows.push(row);
    return row;
  }

  async findByHash(tokenHash: string): Promise<Row | undefined> {
    return this.rows.find((r) => r.tokenHash === tokenHash);
  }

  async consumeById(id: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (row) row.consumedAt = new Date();
  }

  async consumeAllForUser(
    userId: string,
    purpose: SingleUseTokenPurpose,
  ): Promise<void> {
    for (const row of this.rows) {
      if (row.userId === userId && row.purpose === purpose && !row.consumedAt) {
        row.consumedAt = new Date();
      }
    }
  }

  async latestIssuedAt(
    userId: string,
    purpose: SingleUseTokenPurpose,
  ): Promise<Date | null> {
    const matches = this.rows
      .filter((r) => r.userId === userId && r.purpose === purpose)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return matches[0]?.createdAt ?? null;
  }
}

class TestTokenService extends SingleUseTokenService {
  protected readonly repository: SingleUseTokenRepository;

  constructor(
    repo: FakeRepo,
    private readonly ttl: number,
    private readonly forPurpose: SingleUseTokenPurpose = 'reset-password',
  ) {
    super();
    this.repository = repo as unknown as SingleUseTokenRepository;
  }

  protected ttlMs(): number {
    return this.ttl;
  }

  protected purpose(): SingleUseTokenPurpose {
    return this.forPurpose;
  }
}

function makeService(ttlMs = 60_000): {
  repo: FakeRepo;
  service: TestTokenService;
} {
  const repo = new FakeRepo();
  return { repo, service: new TestTokenService(repo, ttlMs) };
}

describe('SingleUseTokenService', () => {
  it('issues an opaque token and stores only its hash + purpose', async () => {
    const { repo, service } = makeService();

    const token = await service.issue('user-1');

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].tokenHash).not.toBe(token);
    expect(repo.rows[0].purpose).toBe('reset-password');
  });

  it('consumes a valid token once, returning the owner id', async () => {
    const { service } = makeService();
    const token = await service.issue('user-1');

    await expect(service.consume(token)).resolves.toBe('user-1');
    await expect(service.consume(token)).rejects.toBeInstanceOf(
      ApplicationError,
    );
  });

  it('rejects an unknown or expired token with a 400', async () => {
    const { service } = makeService(-1); // already expired on issue
    const token = await service.issue('user-1');

    await expect(service.consume('nope')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_TOKEN',
    });
    await expect(service.consume(token)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('will not consume a token issued for a different purpose', async () => {
    const repo = new FakeRepo();
    const reset = new TestTokenService(repo, 60_000, 'reset-password');
    const verify = new TestTokenService(repo, 60_000, 'verify-email');

    const token = await reset.issue('user-1');

    await expect(verify.consume(token)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(reset.consume(token)).resolves.toBe('user-1');
  });

  it('invalidateAllForUser burns every outstanding token of that purpose', async () => {
    const { service } = makeService();
    const a = await service.issue('user-1');
    const b = await service.issue('user-1');

    await service.invalidateAllForUser('user-1');

    await expect(service.consume(a)).rejects.toBeInstanceOf(ApplicationError);
    await expect(service.consume(b)).rejects.toBeInstanceOf(ApplicationError);
  });
});
