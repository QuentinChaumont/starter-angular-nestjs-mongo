import { AccountRetentionJob } from './account-retention.job';

const DAY = 24 * 60 * 60 * 1000;

function build(settings: {
  inactiveDays: number | null;
  warningDays: number | null;
}) {
  const users = {
    findRetentionCandidates: jest.fn().mockResolvedValue([]),
    markRetentionWarned: jest.fn().mockResolvedValue(undefined),
    deleteById: jest.fn().mockResolvedValue(undefined),
  };
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const appSettings = {
    get: jest.fn().mockResolvedValue({ accountRetention: settings }),
  };
  const config = { accountRetention: { cron: '0 3 * * *', batchLimit: 1000 } };
  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const job = new AccountRetentionJob(
    appSettings as never,
    users as never,
    mailer as never,
    config as never,
    logger as never,
  );
  return { job, users, mailer, appSettings };
}

const NOW = new Date('2026-06-01T03:00:00.000Z');

describe('AccountRetentionJob.run', () => {
  it('does nothing when inactiveDays is null', async () => {
    const { job, users } = build({ inactiveDays: null, warningDays: null });
    const result = await job.run(NOW);
    expect(result).toEqual({ warned: 0, deleted: 0 });
    expect(users.findRetentionCandidates).not.toHaveBeenCalled();
  });

  it('warns accounts entering the window and stamps retentionWarnedAt', async () => {
    const { job, users, mailer } = build({ inactiveDays: 180, warningDays: 14 });
    users.findRetentionCandidates
      .mockResolvedValueOnce([
        { _id: 'u1', email: 'u1@x.y', firstName: 'A', locale: 'en',
          lastActiveAt: new Date(NOW.getTime() - 170 * DAY), createdAt: new Date(0) },
      ]) // warn phase
      .mockResolvedValueOnce([]); // delete phase

    const result = await job.run(NOW);

    expect(users.findRetentionCandidates).toHaveBeenNthCalledWith(1, {
      before: new Date(NOW.getTime() - (180 - 14) * DAY),
      onlyUnwarned: true,
      limit: 1000,
    });
    expect(mailer.send).toHaveBeenCalledTimes(1);
    expect(users.markRetentionWarned).toHaveBeenCalledWith('u1', NOW);
    expect(result.warned).toBe(1);
  });

  it('deletes only accounts warned at least warningDays ago', async () => {
    const { job, users } = build({ inactiveDays: 180, warningDays: 14 });
    users.findRetentionCandidates
      .mockResolvedValueOnce([]) // warn phase
      .mockResolvedValueOnce([
        { _id: 'u2', email: 'u2@x.y', firstName: 'B',
          lastActiveAt: new Date(NOW.getTime() - 200 * DAY), createdAt: new Date(0),
          retentionWarnedAt: new Date(NOW.getTime() - 15 * DAY) },
      ]);

    const result = await job.run(NOW);

    expect(users.findRetentionCandidates).toHaveBeenNthCalledWith(2, {
      before: new Date(NOW.getTime() - 180 * DAY),
      warnedBefore: new Date(NOW.getTime() - 14 * DAY),
      limit: 1000,
    });
    expect(users.deleteById).toHaveBeenCalledWith('u2', { reason: 'retention' });
    expect(result.deleted).toBe(1);
  });

  it('with warningDays null, deletes past-threshold accounts with no email', async () => {
    const { job, users, mailer } = build({ inactiveDays: 90, warningDays: null });
    users.findRetentionCandidates.mockResolvedValueOnce([
      { _id: 'u3', email: 'u3@x.y', firstName: 'C',
        lastActiveAt: new Date(NOW.getTime() - 100 * DAY), createdAt: new Date(0) },
    ]);

    const result = await job.run(NOW);

    // warn phase skipped entirely
    expect(mailer.send).not.toHaveBeenCalled();
    expect(users.findRetentionCandidates).toHaveBeenCalledTimes(1);
    expect(users.findRetentionCandidates).toHaveBeenCalledWith({
      before: new Date(NOW.getTime() - 90 * DAY),
      limit: 1000,
    });
    expect(users.deleteById).toHaveBeenCalledWith('u3', { reason: 'retention' });
    expect(result.deleted).toBe(1);
  });

  it('leaves retentionWarnedAt unset if the email send throws', async () => {
    const { job, users, mailer } = build({ inactiveDays: 180, warningDays: 14 });
    mailer.send.mockRejectedValueOnce(new Error('smtp down'));
    users.findRetentionCandidates
      .mockResolvedValueOnce([
        { _id: 'u4', email: 'u4@x.y', firstName: 'D',
          lastActiveAt: new Date(NOW.getTime() - 170 * DAY), createdAt: new Date(0) },
      ])
      .mockResolvedValueOnce([]);

    const result = await job.run(NOW);

    expect(users.markRetentionWarned).not.toHaveBeenCalled();
    expect(result.warned).toBe(0);
  });
});
