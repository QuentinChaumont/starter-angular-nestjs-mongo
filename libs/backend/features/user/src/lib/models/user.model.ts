/**
 * Plain data shape for a User, independent from persistence concerns.
 * Mirrored by `@Prop()` decorators on the schema class in `user.schema.ts`.
 */
export interface UserModel {
  email: string;
  /** Optional: an OIDC-only account (V2.2 step 42) has no local password. */
  password?: string;
  firstName: string;
  lastName: string;
  roles: string[];
  emailVerifiedAt?: Date;
  disabledAt?: Date;
  /** Preferred UI + email language (V2.3 step 47). */
  locale?: string;
  /** Two-factor authentication (V2.2 step 43). */
  twoFactorSecret?: string;
  twoFactorPendingSecret?: string;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string[];
  createdAt: Date;
  updatedAt: Date;
}
