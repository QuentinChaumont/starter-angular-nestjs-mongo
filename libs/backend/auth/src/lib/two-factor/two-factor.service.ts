import { Injectable } from '@nestjs/common';
import {
  AppConfigService,
  ValidationError,
  verifyPassword,
} from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { toDataURL } from 'qrcode';
import { resolveJwtConfig } from '../resolve-jwt-config';
import {
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCodes,
} from './backup-codes';
import { decryptSecret, encryptSecret } from './secret-cipher';
import { generateTotpSecret, otpauthUri, verifyTotp } from './totp';

/** Groups the account's entries in the authenticator app. Projects rename it. */
export const TWO_FACTOR_ISSUER = 'App';

export interface TwoFactorSetup {
  otpauthUri: string;
  qrDataUri: string;
  secret: string;
}

/**
 * TOTP two-factor (V2.2 step 43). Secrets are AES-encrypted at rest with a
 * key derived from `JWT_SECRET`; backup codes are scrypt-hashed like
 * passwords. Nothing is active until {@link confirm} verifies the first
 * code.
 */
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly users: UserService,
    private readonly config: AppConfigService,
  ) {}

  private get key(): string {
    return resolveJwtConfig(this.config).secret;
  }

  /**
   * Start enrollment: mint a secret, stash it **pending** (encrypted), and
   * hand back the `otpauth://` URI + a QR data-URI. Re-running before
   * confirming just replaces the pending secret.
   */
  async setup(userId: string): Promise<TwoFactorSetup> {
    const user = await this.users.findByIdWithTwoFactor(userId);
    const secret = generateTotpSecret();

    user.twoFactorPendingSecret = encryptSecret(secret, this.key);
    await user.save();

    const uri = otpauthUri({
      secret,
      accountName: user.email,
      issuer: TWO_FACTOR_ISSUER,
    });
    return { otpauthUri: uri, qrDataUri: await toDataURL(uri), secret };
  }

  /**
   * Verify the first code against the pending secret, then activate 2FA and
   * return 10 one-time backup codes (shown once).
   */
  async confirm(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.users.findByIdWithTwoFactor(userId);
    if (!user.twoFactorPendingSecret) {
      throw new ValidationError(
        'TWO_FACTOR_SETUP_MISSING',
        'Start two-factor setup first',
      );
    }

    const secret = decryptSecret(user.twoFactorPendingSecret, this.key);
    if (!verifyTotp(secret, code.trim())) {
      throw new ValidationError('TWO_FACTOR_INVALID', 'That code is not valid');
    }

    const backupCodes = generateBackupCodes();
    user.twoFactorSecret = user.twoFactorPendingSecret;
    user.twoFactorPendingSecret = undefined;
    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = await hashBackupCodes(backupCodes);
    await user.save();

    return { backupCodes };
  }

  /** Turn 2FA off after re-confirming the account password. */
  async disable(userId: string, password: string): Promise<void> {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user.password || !(await verifyPassword(password, user.password))) {
      throw new ValidationError(
        'INVALID_PASSWORD',
        'The password is incorrect',
      );
    }

    const withSecrets = await this.users.findByIdWithTwoFactor(userId);
    withSecrets.twoFactorEnabled = false;
    withSecrets.twoFactorSecret = undefined;
    withSecrets.twoFactorPendingSecret = undefined;
    withSecrets.twoFactorBackupCodes = undefined;
    await withSecrets.save();
  }

  /**
   * Login-time check: a valid TOTP code, or a backup code (consumed on
   * use). Returns `false` for anything else.
   */
  async verifyLoginCode(userId: string, code: string): Promise<boolean> {
    const user = await this.users.findByIdWithTwoFactor(userId);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    const trimmed = code.trim();
    const secret = decryptSecret(user.twoFactorSecret, this.key);
    if (verifyTotp(secret, trimmed)) {
      return true;
    }

    const remaining = await consumeBackupCode(
      trimmed,
      user.twoFactorBackupCodes ?? [],
    );
    if (remaining) {
      user.twoFactorBackupCodes = remaining;
      await user.save();
      return true;
    }
    return false;
  }
}
