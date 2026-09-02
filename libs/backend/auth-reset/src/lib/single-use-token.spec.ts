import { ApplicationError } from '@org/backend-core';
import {
  SingleUseTokenFields,
  SingleUseTokenRepository,
  SingleUseTokenService,
} from './single-use-token';

interface Row extends SingleUseTokenFields {
  id: string;
}

/** In-memory stand-in for the Mongo-backed repository. */
class FakeRepo {
  rows: Row[] = [];
  private seq = 0;

  async create(input: Partial<SingleUseTokenFields>): Promise<Row> {
    const row: Row = {
      id: `row-${this.seq++}`,
      userId: input.userId as string,
      tokenHash: input.tokenHash as string,
      expiresAt: input.expiresAt as Date,
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

  async consumeAllForUser(userId: string): Promise<void> {
    for (const row of this.rows) {
      if (row.userId === userId && !row.consumedAt) row.consumedAt = new Date();
    }
  }
}

class TestTokenService extends SingleUseTokenService<SingleUseTokenFields> {
  protected readonly repository: SingleUseTokenRepository<SingleUseTokenFields>;

  constructor(repo: FakeRepo, private readonly ttl: number) {
    super();
    this.repository =
      repo as unknown as SingleUseTokenRepository<SingleUseTokenFields>;
  }

  protected ttlMs(): number {
    return this.ttl;
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
  it('issues an opaque token and stores only its hash', async () => {
    const { repo, service } = makeService();

    const token = await service.issue('user-1');

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].tokenHash).not.toBe(token);
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

  it('invalidateAllForUser burns every outstanding token', async () => {
    const { service } = makeService();
    const a = await service.issue('user-1');
    const b = await service.issue('user-1');

    await service.invalidateAllForUser('user-1');

    await expect(service.consume(a)).rejects.toBeInstanceOf(ApplicationError);
    await expect(service.consume(b)).rejects.toBeInstanceOf(ApplicationError);
  });
});
