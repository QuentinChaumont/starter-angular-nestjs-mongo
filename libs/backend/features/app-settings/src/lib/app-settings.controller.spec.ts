import { AppSettingsController } from './app-settings.controller';
import { PublicSettingsController } from './public-settings.controller';

function svc(overrides: Partial<Record<'get' | 'update', jest.Mock>> = {}) {
  return {
    get: overrides.get ?? jest.fn().mockResolvedValue({
      accountRetention: { inactiveDays: null, warningDays: null },
    }),
    update: overrides.update ?? jest.fn().mockResolvedValue({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    }),
  } as never;
}

describe('AppSettingsController', () => {
  it('GET returns the full settings object', async () => {
    const service = svc();
    const ctrl = new AppSettingsController(service);
    await expect(ctrl.get()).resolves.toEqual({
      accountRetention: { inactiveDays: null, warningDays: null },
    });
  });

  it('PATCH forwards the body and the caller id to the service', async () => {
    const update = jest.fn().mockResolvedValue({
      accountRetention: { inactiveDays: 180, warningDays: 14 },
    });
    const ctrl = new AppSettingsController(svc({ update }));
    await ctrl.patch(
      { accountRetention: { inactiveDays: 180, warningDays: 14 } } as never,
      { id: 'admin-1', roles: ['admin'] } as never,
    );
    expect(update).toHaveBeenCalledWith(
      { accountRetention: { inactiveDays: 180, warningDays: 14 } },
      { changedBy: 'admin-1' },
    );
  });

  it('carries the admin @Roles metadata', () => {
    const roles = Reflect.getMetadata('roles', AppSettingsController);
    expect(roles).toEqual(['admin']);
  });
});

describe('PublicSettingsController', () => {
  it('exposes only the whitelisted accountRetention block', async () => {
    const service = svc({
      get: jest.fn().mockResolvedValue({
        accountRetention: { inactiveDays: 90, warningDays: 7 },
        somethingSecret: 'x',
      }),
    });
    const ctrl = new PublicSettingsController(service);
    await expect(ctrl.get()).resolves.toEqual({
      accountRetention: { inactiveDays: 90, warningDays: 7 },
    });
  });

  it('has no @Roles metadata (route is public)', () => {
    expect(Reflect.getMetadata('roles', PublicSettingsController)).toBeUndefined();
  });
});
