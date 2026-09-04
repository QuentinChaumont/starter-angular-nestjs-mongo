export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

/** Log severities, least → most severe. `LOG_LEVEL` sets the minimum emitted. */
export const LOG_LEVELS = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
] as const;

export type LogLevelName = (typeof LOG_LEVELS)[number];

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  CORS_ORIGINS: string[];
  /** Minimum log severity to emit. Unset → `debug` outside production,
   * `log` in production. */
  LOG_LEVEL?: LogLevelName;
  /** Express `trust proxy` setting — needed behind a reverse proxy (nginx,
   * a load balancer, the `docker` brick) so `req.ip` and `req.protocol`
   * reflect the real client, not the proxy. `true`, `false`, a hop count
   * (`1`), or an Express trust list (`loopback`, a subnet). Unset → `false`
   * (direct exposure). */
  TRUST_PROXY?: string;
  RATE_LIMIT_TTL_SECONDS: number;
  RATE_LIMIT_LIMIT: number;
  /** Stricter rate limit for `POST /auth/login` + `POST /auth/register`
   * (defaults: 10 requests / 60 s). */
  AUTH_RATE_LIMIT_TTL_SECONDS?: number;
  AUTH_RATE_LIMIT_LIMIT?: number;
  MONGO_URI?: string;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  REFRESH_EXPIRES_IN?: string;
  AUTH_COOKIE_SECURE?: boolean;
  /** Self-service email/password registration. Defaults to enabled. */
  AUTH_REGISTRATION_ENABLED?: boolean;
  /** Bootstrap admin account, created idempotently by `pnpm seed:admin`. */
  SEED_ADMIN_EMAIL?: string;
  SEED_ADMIN_PASSWORD?: string;
  /** When `true`, `POST /auth/login` is refused (`403 EMAIL_NOT_VERIFIED`)
   * until the account's email is verified. Defaults to `false` (soft:
   * account usable, a banner nudges the user). `auth-reset` brick. */
  AUTH_REQUIRE_VERIFIED_EMAIL?: boolean;
  /** Password-reset link lifetime, minutes (default 60). `auth-reset`. */
  RESET_TOKEN_TTL_MINUTES?: number;
  /** Email-verification link lifetime, hours (default 24). `auth-reset`. */
  VERIFICATION_TOKEN_TTL_HOURS?: number;
  /** Min seconds between two manual "resend verification email" requests
   * for one account (default 300). `auth-reset`. */
  VERIFICATION_RESEND_COOLDOWN_SECONDS?: number;
  /** Days an audit event is kept before the TTL index drops it (default
   * 90). `0` disables the TTL (keep forever). `audit` brick (V2.3). */
  AUDIT_RETENTION_DAYS?: number;
  OIDC_ISSUER?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  OIDC_REDIRECT_URI?: string;
  OIDC_SCOPES?: string;
  OIDC_POST_LOGIN_REDIRECT?: string;
  OIDC_FRONTEND_URL?: string;
  OIDC_REQUIRE_VERIFIED_EMAIL?: boolean;
  OIDC_ROLES_CLAIM?: string;
  /** Google sign-in preset (issuer + scopes are fixed). Active only when
   * both id and secret are set. The callback origin is taken from
   * `OIDC_REDIRECT_URI` (segment swapped to `google`). */
  OIDC_GOOGLE_CLIENT_ID?: string;
  OIDC_GOOGLE_CLIENT_SECRET?: string;
  /** Keycloak preset. Active once issuer + client id are set; the secret
   * is optional (public client + PKCE when omitted, like the generic
   * provider). The callback origin is taken from `OIDC_REDIRECT_URI`
   * (segment swapped to `keycloak`). */
  OIDC_KEYCLOAK_ISSUER?: string;
  OIDC_KEYCLOAK_CLIENT_ID?: string;
  OIDC_KEYCLOAK_CLIENT_SECRET?: string;
  /** Dot-path to the realm-roles claim (default `realm_access.roles`). */
  OIDC_KEYCLOAK_ROLES_CLAIM?: string;
  /** Overrides the "Keycloak" login-button label. */
  OIDC_KEYCLOAK_LABEL?: string;
  /** SMTP connection string. When set, the `mailer` brick delivers over
   * SMTP (needs the optional `nodemailer` package); otherwise it logs to
   * the console and writes `.eml` previews. */
  SMTP_URL?: string;
  /** `From` address for outgoing mail (default `no-reply@localhost`). */
  MAIL_FROM?: string;
  /** Directory the console transport drops `.eml` previews into
   * (default `tmp/mail`). */
  MAIL_PREVIEW_DIR?: string;
}

/**
 * Every environment variable this app reads. Handy for docs, and for tests
 * that need to guarantee a variable is *absent* (`ConfigService.get()` falls
 * back to `process.env`, and Nx injects the repo-root `.env` into every task).
 */
export const ENVIRONMENT_VARIABLE_NAMES: readonly (keyof EnvironmentVariables)[] =
  [
    'NODE_ENV',
    'PORT',
    'CORS_ORIGINS',
    'LOG_LEVEL',
    'TRUST_PROXY',
    'RATE_LIMIT_TTL_SECONDS',
    'RATE_LIMIT_LIMIT',
    'AUTH_RATE_LIMIT_TTL_SECONDS',
    'AUTH_RATE_LIMIT_LIMIT',
    'MONGO_URI',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'REFRESH_EXPIRES_IN',
    'AUTH_COOKIE_SECURE',
    'AUTH_REGISTRATION_ENABLED',
    'SEED_ADMIN_EMAIL',
    'SEED_ADMIN_PASSWORD',
    'AUTH_REQUIRE_VERIFIED_EMAIL',
    'RESET_TOKEN_TTL_MINUTES',
    'VERIFICATION_TOKEN_TTL_HOURS',
    'VERIFICATION_RESEND_COOLDOWN_SECONDS',
    'AUDIT_RETENTION_DAYS',
    'OIDC_ISSUER',
    'OIDC_CLIENT_ID',
    'OIDC_CLIENT_SECRET',
    'OIDC_REDIRECT_URI',
    'OIDC_SCOPES',
    'OIDC_POST_LOGIN_REDIRECT',
    'OIDC_FRONTEND_URL',
    'OIDC_REQUIRE_VERIFIED_EMAIL',
    'OIDC_ROLES_CLAIM',
    'OIDC_GOOGLE_CLIENT_ID',
    'OIDC_GOOGLE_CLIENT_SECRET',
    'OIDC_KEYCLOAK_ISSUER',
    'OIDC_KEYCLOAK_CLIENT_ID',
    'OIDC_KEYCLOAK_CLIENT_SECRET',
    'OIDC_KEYCLOAK_ROLES_CLAIM',
    'OIDC_KEYCLOAK_LABEL',
    'SMTP_URL',
    'MAIL_FROM',
    'MAIL_PREVIEW_DIR',
  ];
