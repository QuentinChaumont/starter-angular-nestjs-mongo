import { UserService, ACTIVITY_THROTTLE_MS } from './user.service';
import { UserEvents } from './user-events';

function build(user: Record<string, unknown> | null) {
  const repo = {
    findById: jest.fn().mockResolvedValue(user),
    stampActivity: jest.fn().mockResolvedValue(undefined),
    deleteById: jest.fn().mockResolvedValue(true),
    findRetentionCandidates: jest.fn().mockResolvedValue([]),
    markRetentionWarned: jest.fn().mockResolvedValue(undefined),
  };
  const events = new UserEvents();
  return { service: new UserService(repo as never, events), repo, events };
}

describe('UserService.recordActivity', () => {
  it('stamps when lastActiveAt is unset', async () => {
    const { service, repo } = build({ _id: 'u1', email: 'a@b.c' });
    await service.recordActivity('u1');
    expect(repo.stampActivity).toHaveBeenCalledWith('u1', expect.any(Date));
  });

  it('stamps when lastActiveAt is older than the throttle window', async () => {
    const old = new Date(Date.now() - ACTIVITY_THROTTLE_MS - 1000);
    const { service, repo } = build({ _id: 'u1', lastActiveAt: old });
    await service.recordActivity('u1');
    expect(repo.stampActivity).toHaveBeenCalled();
  });

  it('is a no-op when fresh and not warned', async () => {
    const { service, repo } = build({
      _id: 'u1',
      lastActiveAt: new Date(),
      retentionWarnedAt: undefined,
    });
    await service.recordActivity('u1');
    expect(repo.stampActivity).not.toHaveBeenCalled();
  });

  it('always stamps when a retention warning is pending, even if fresh', async () => {
    const { service, repo } = build({
      _id: 'u1',
      lastActiveAt: new Date(),
      retentionWarnedAt: new Date(),
    });
    await service.recordActivity('u1');
    expect(repo.stampActivity).toHaveBeenCalled();
  });

  it('never throws when the user is gone', async () => {
    const { service } = build(null);
    await expect(service.recordActivity('missing')).resolves.toBeUndefined();
  });
});

describe('UserService.deleteById', () => {
  it('emits user.deleted with reason "self" by default', async () => {
    const { service, events } = build({ _id: 'u1', email: 'a@b.c' });
    const onDeleted = jest.fn();
    events.onDeleted(onDeleted);
    await service.deleteById('u1');
    expect(onDeleted).toHaveBeenCalledWith({
      userId: 'u1',
      email: 'a@b.c',
      reason: 'self',
    });
  });

  it('emits reason "retention" when asked', async () => {
    const { service, events } = build({ _id: 'u1', email: 'a@b.c' });
    const onDeleted = jest.fn();
    events.onDeleted(onDeleted);
    await service.deleteById('u1', { reason: 'retention' });
    expect(onDeleted.mock.calls[0][0].reason).toBe('retention');
  });

  it('emits reason "admin" when asked', async () => {
    const { service, events } = build({ _id: 'u1', email: 'a@b.c' });
    const onDeleted = jest.fn();
    events.onDeleted(onDeleted);
    await service.deleteById('u1', { reason: 'admin' });
    expect(onDeleted.mock.calls[0][0].reason).toBe('admin');
  });
});

describe('UserService retention queries', () => {
  it('passes findRetentionCandidates options straight through to the repo', async () => {
    const { service, repo } = build(null);
    const rows = [{ _id: 'u1' }];
    repo.findRetentionCandidates.mockResolvedValueOnce(rows);
    const before = new Date('2026-01-01T00:00:00.000Z');
    const warnedBefore = new Date('2026-01-15T00:00:00.000Z');

    await expect(
      service.findRetentionCandidates({ before, onlyUnwarned: true, limit: 50 }),
    ).resolves.toBe(rows);
    expect(repo.findRetentionCandidates).toHaveBeenNthCalledWith(1, {
      before,
      onlyUnwarned: true,
      limit: 50,
    });

    await service.findRetentionCandidates({ before, warnedBefore, limit: 10 });
    expect(repo.findRetentionCandidates).toHaveBeenNthCalledWith(2, {
      before,
      warnedBefore,
      limit: 10,
    });
  });

  it('markRetentionWarned delegates to the repo verbatim', async () => {
    const { service, repo } = build(null);
    const at = new Date('2026-02-02T02:02:02.000Z');
    await service.markRetentionWarned('u9', at);
    expect(repo.markRetentionWarned).toHaveBeenCalledWith('u9', at);
  });
});
