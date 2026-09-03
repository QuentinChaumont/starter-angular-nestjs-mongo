/**
 * The audit action names emitted by the bundled bricks (V2.3 step 45).
 * Dotted + lowercase; the frontend filter matches on substring so
 * `auth.` narrows to every auth event.
 */
export const AUDIT_ACTION = {
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login-failed',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGED: 'auth.password-changed',
  TWO_FACTOR_ENABLED: 'auth.2fa-enabled',
  TWO_FACTOR_DISABLED: 'auth.2fa-disabled',
  TOKEN_REUSED: 'auth.token-reused',
  IDENTITY_LINKED: 'auth.identity-linked',
  IDENTITY_UNLINKED: 'auth.identity-unlinked',
  ROLES_CHANGED: 'admin.roles-changed',
  STATUS_CHANGED: 'admin.status-changed',
  SESSIONS_REVOKED: 'admin.sessions-revoked',
} as const;

export type AuditAction =
  (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];
