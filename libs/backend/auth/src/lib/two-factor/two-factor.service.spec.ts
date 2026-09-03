import { hashPassword } from '@org/backend-core';
import { buildTestConfig } from '@org/backend-testing';
import type { UserService } from '@org/backend-features-user';
import { TwoFactorService } from './two-factor.service';
import { generateTotp } from './totp';

const JWT_SECRET = 'test-secret';

class FakeUser {
  email = 'ada@example.com';
  password?: string;
  twoFactorSecret?: string;
  twoFactorPendingSecret?: string;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string[];
  save = jest.fn(async () => undefined);
}

function build(user: FakeUser) {
  const users = {
    findByIdWithTwoFactor: jest.fn().mockResolvedValue(user),
    findByIdWithPassword: jest.fn().mockResolvedValue(user),
  } as unknown as UserService;
  const service = new TwoFactorService(
    users,
    buildTestConfig({ JWT_SECRET }),
  );
  return { service, user };
}

describe('TwoFactorService', () => {
  describe('setup', () => {
    it('stashes an encrypted pending secret and returns a QR data-URI', async () => {
      const { service, user } = build(new FakeUser());

      const result = await service.setup('u1');

      expect(user.twoFactorPendingSecret).toEqual(expect.any(String));
      expect(user.twoFactorEnabled).toBeFalsy();
      expect(result.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
      expect(result.qrDataUri).toMatch(/^data:image\/png;base64,/);
      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    });
  });

  describe('confirm', () => {
    it('activates 2FA and returns 10 backup codes for a valid first code', async () => {
      const { service, user } = build(new FakeUser());
      const { secret } = await service.setup('u1');

      const { backupCodes } = await service.confirm(
        'u1',
        generateTotp(secret),
      );

      expect(backupCodes).toHaveLength(10);
      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorSecret).toEqual(expect.any(String));
      expect(user.twoFactorPendingSecret).toBeUndefined();
      expect(user.twoFactorBackupCodes).toHaveLength(10);
    });

    it('rejects a wrong first code', async () => {
      const { service } = build(new FakeUser());
      await service.setup('u1');

      await expect(service.confirm('u1', '000000')).rejects.toMatchObject({
        code: 'TWO_FACTOR_INVALID',
      });
    });

    it('rejects confirm with no setup in progress', async () => {
      const { service } = build(new FakeUser());

      await expect(service.confirm('u1', '123456')).rejects.toMatchObject({
        code: 'TWO_FACTOR_SETUP_MISSING',
      });
    });
  });

  describe('verifyLoginCode', () => {
    async function enrolled() {
      const built = build(new FakeUser());
      const { secret } = await built.service.setup('u1');
      const { backupCodes } = await built.service.confirm(
        'u1',
        generateTotp(secret),
      );
      return { ...built, secret, backupCodes };
    }

    it('accepts a current TOTP code', async () => {
      const { service, secret } = await enrolled();
      expect(await service.verifyLoginCode('u1', generateTotp(secret))).toBe(
        true,
      );
    });

    it('accepts a backup code once, then never again', async () => {
      const { service, backupCodes, user } = await enrolled();

      expect(await service.verifyLoginCode('u1', backupCodes[0])).toBe(true);
      expect(user.twoFactorBackupCodes).toHaveLength(9);
      expect(await service.verifyLoginCode('u1', backupCodes[0])).toBe(false);
    });

    it('rejects an arbitrary code', async () => {
      const { service } = await enrolled();
      expect(await service.verifyLoginCode('u1', '000000')).toBe(false);
    });
  });

  describe('disable', () => {
    it('clears everything after a correct password', async () => {
      const user = new FakeUser();
      user.password = await hashPassword('pw');
      const { service } = build(user);
      const { secret } = await service.setup('u1');
      await service.confirm('u1', generateTotp(secret));

      await service.disable('u1', 'pw');

      expect(user.twoFactorEnabled).toBe(false);
      expect(user.twoFactorSecret).toBeUndefined();
      expect(user.twoFactorBackupCodes).toBeUndefined();
    });

    it('rejects a wrong password', async () => {
      const user = new FakeUser();
      user.password = await hashPassword('pw');
      const { service } = build(user);

      await expect(service.disable('u1', 'nope')).rejects.toMatchObject({
        code: 'INVALID_PASSWORD',
      });
    });
  });
});
