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
  const config = {
    accountRetention: { cron: '0 3 * * *', batchLimit: 1000 },
    oidc: { frontendUrl: undefined },
    http: { corsOrigins: ['http://localhost:4200'] },
  };
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
      expiredWarningBefore: new Date(NOW.getTime() - 2 * 14 * DAY),
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
      warnedAfter: new Date(NOW.getTime() - 2 * 14 * DAY),
      limit: 1000,
    });
    expect(users.deleteById).toHaveBeenCalledWith('u2', { reason: 'retention' });
    expect(result.deleted).toBe(1);
  });

  it('excludes a warning older than 2x warningDays from the delete phase and treats it as due for a fresh warning (finding #7)', async () => {
    const { job, users } = build({ inactiveDays: 180, warningDays: 14 });
    users.findRetentionCandidates.mockResolvedValue([]);

    await job.run(NOW);

    const staleWarningBefore = new Date(NOW.getTime() - 2 * 14 * DAY);
    // Warn phase: an account whose prior warning is this stale counts as
    // unwarned again, not "already handled".
    expect(users.findRetentionCandidates).toHaveBeenNthCalledWith(1, {
      before: new Date(NOW.getTime() - (180 - 14) * DAY),
      onlyUnwarned: true,
      expiredWarningBefore: staleWarningBefore,
      limit: 1000,
    });
    // Delete phase: a warning this stale no longer authorizes deletion —
    // without this bound, disabling retention after a warning went out
    // and re-enabling it later would delete the account off that
    // long-expired warning, with no fresh one ever sent.
    expect(users.findRetentionCandidates).toHaveBeenNthCalledWith(2, {
      before: new Date(NOW.getTime() - 180 * DAY),
      warnedBefore: new Date(NOW.getTime() - 14 * DAY),
      warnedAfter: staleWarningBefore,
      limit: 1000,
    });
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

  it('states a deletion date that is never in the past, even well past the warn threshold (finding #1)', async () => {
    const { job, users, mailer } = build({ inactiveDays: 180, warningDays: 14 });
    // 210 days inactive — 30 days further past `inactiveDays` than an
    // account that *just* crossed the warn threshold (166 days). The
    // naive `lastActiveAt + inactiveDays` formula would land 30 days in
    // the past.
    users.findRetentionCandidates
      .mockResolvedValueOnce([
        { _id: 'u5', email: 'u5@x.y', firstName: 'E', locale: 'en',
          lastActiveAt: new Date(NOW.getTime() - 210 * DAY), createdAt: new Date(0) },
      ])
      .mockResolvedValueOnce([]);

    await job.run(NOW);

    const mail = mailer.send.mock.calls[0][0];
    // The account can never actually be deleted before its full warning
    // window elapses (the delete-phase guard), so the earliest truthful
    // date is `now + warningDays`.
    const earliestPossibleDeletion = new Date(NOW.getTime() + 14 * DAY);
    const expectedDate = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(earliestPossibleDeletion);
    expect(mail.text).toContain(expectedDate);
  });

  it('builds an absolute profile link from the CORS origin when OIDC_FRONTEND_URL is unset (finding #3)', async () => {
    const { job, users, mailer } = build({ inactiveDays: 180, warningDays: 14 });
    users.findRetentionCandidates
      .mockResolvedValueOnce([
        { _id: 'u6', email: 'u6@x.y', firstName: 'F', locale: 'en',
          lastActiveAt: new Date(NOW.getTime() - 170 * DAY), createdAt: new Date(0) },
      ])
      .mockResolvedValueOnce([]);

    await job.run(NOW);

    const mail = mailer.send.mock.calls[0][0];
    expect(mail.text).toContain('http://localhost:4200/app/profile');
    expect(mail.text).not.toContain('undefined/app/profile');
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
