import type { AppConfigService, RequestContextService } from '@org/backend-core';
import type { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

function build(overrides: {
  create?: jest.Mock;
  actor?: { id: string; ip?: string; userAgent?: string };
}) {
  const create = overrides.create ?? jest.fn().mockResolvedValue({});
  const repo = { create } as unknown as AuditRepository;
  const config = { audit: { retentionDays: 90 } } as AppConfigService;
  const ctx = {
    get actor() {
      return overrides.actor;
    },
  } as unknown as RequestContextService;
  return { service: new AuditService(repo, config, ctx), create };
}

describe('AuditService.record', () => {
  it('fills actor / ip / userAgent from the request context', async () => {
    const { service, create } = build({
      actor: { id: 'admin-1', ip: '10.0.0.1', userAgent: 'jest' },
    });

    service.record({ action: 'admin.roles-changed', target: 'user-9' });
    await flush();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.roles-changed',
        actorId: 'admin-1',
        target: 'user-9',
        ip: '10.0.0.1',
        userAgent: 'jest',
      }),
    );
  });

  it('prefers an explicit actorId over the context', async () => {
    const { service, create } = build({ actor: { id: 'admin-1' } });

    service.record({ action: 'auth.login', actorId: 'user-2' });
    await flush();

    expect(create.mock.calls[0][0].actorId).toBe('user-2');
  });

  it('strips secret-ish keys from meta', async () => {
    const { service, create } = build({});

    service.record({
      action: 'x',
      meta: { roles: ['admin'], password: 'nope', accessToken: 'nope' },
    });
    await flush();

    expect(create.mock.calls[0][0].meta).toEqual({ roles: ['admin'] });
  });

  it('never throws when the write fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('mongo down'));
    const { service } = build({ create });

    expect(() => service.record({ action: 'auth.login' })).not.toThrow();
    await flush();
  });
});

/** Let the fire-and-forget `.catch()` settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
