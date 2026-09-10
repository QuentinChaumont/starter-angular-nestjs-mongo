import { ValidationError } from '@org/backend-core';
import { DEFAULT_SETTINGS } from './app-settings.defaults';
import { AppSettingsEvents } from './app-settings.events';
import { AppSettingsService } from './app-settings.service';

function build(stored: Record<string, unknown> | null = null) {
  const doc = stored ? { toObject: () => stored, ...stored } : null;
  const repo = {
    loadSingleton: jest.fn().mockResolvedValue(doc),
    upsertSingleton: jest.fn().mockImplementation((set: Record<string, unknown>) => {
      // reflect a naive merge back, mimicking Mongo $set on dot-paths
      const next = JSON.parse(JSON.stringify(stored ?? {}));
      for (const [path, value] of Object.entries(set)) {
        const parts = path.split('.');
        let node = next;
        for (const p of parts.slice(0, -1)) node = node[p] ??= {};
        node[parts.at(-1) as string] = value;
      }
      return Promise.resolve({ toObject: () => next, ...next });
    }),
  };
  const events = new AppSettingsEvents();
  const updated = jest.fn();
  events.onUpdated(updated);
  return {
    service: new AppSettingsService(repo as never, events),
    repo,
    updated,
  };
}

describe('AppSettingsService.get', () => {
  it('returns defaults when no document exists', async () => {
    const { service } = build(null);
    await expect(service.get()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial stored document over the defaults', async () => {
    const { service } = build({ accountRetention: { inactiveDays: 200 } });
    await expect(service.get()).resolves.toEqual({
      accountRetention: { inactiveDays: 200, warningDays: null },
    });
  });
});

describe('AppSettingsService.update', () => {
  it('persists a partial patch as dot-path $set and emits settings.updated', async () => {
    const { service, repo, updated } = build({
      accountRetention: { inactiveDays: null, warningDays: null },
    });

    const result = await service.update(
      { accountRetention: { inactiveDays: 180, warningDays: 14 } },
      { changedBy: 'admin-1' },
    );

    expect(repo.upsertSingleton).toHaveBeenCalledWith({
      'accountRetention.inactiveDays': 180,
      'accountRetention.warningDays': 14,
    });
    expect(result.accountRetention).toEqual({ inactiveDays: 180, warningDays: 14 });
    expect(updated).toHaveBeenCalledWith({ changedBy: 'admin-1' });
  });

  it('accepts null to clear a value', async () => {
    const { service, repo } = build({ accountRetention: { inactiveDays: 180, warningDays: 14 } });
    await service.update({ accountRetention: { inactiveDays: null } });
    expect(repo.upsertSingleton).toHaveBeenCalledWith({ 'accountRetention.inactiveDays': null });
  });

  it.each([
    ['zero', { inactiveDays: 0 }],
    ['negative', { inactiveDays: -5 }],
    ['non-integer', { inactiveDays: 1.5 }],
  ])('rejects a %s retention period', async (_label, patch) => {
    const { service } = build();
    await expect(
      service.update({ accountRetention: patch as never }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects warningDays >= inactiveDays against the merged result', async () => {
    const { service } = build({ accountRetention: { inactiveDays: 10, warningDays: null } });
    await expect(
      service.update({ accountRetention: { warningDays: 10 } }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows warningDays alone only when it stays below the stored inactiveDays', async () => {
    const { service, repo } = build({ accountRetention: { inactiveDays: 30, warningDays: null } });
    await service.update({ accountRetention: { warningDays: 7 } });
    expect(repo.upsertSingleton).toHaveBeenCalledWith({ 'accountRetention.warningDays': 7 });
  });
});
