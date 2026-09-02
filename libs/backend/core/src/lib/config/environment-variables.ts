export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  CORS_ORIGINS: string[];
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
  OIDC_ISSUER?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  OIDC_REDIRECT_URI?: string;
  OIDC_SCOPES?: string;
  OIDC_POST_LOGIN_REDIRECT?: string;
  OIDC_FRONTEND_URL?: string;
  OIDC_REQUIRE_VERIFIED_EMAIL?: boolean;
  OIDC_ROLES_CLAIM?: string;
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
    'OIDC_ISSUER',
    'OIDC_CLIENT_ID',
    'OIDC_CLIENT_SECRET',
    'OIDC_REDIRECT_URI',
    'OIDC_SCOPES',
    'OIDC_POST_LOGIN_REDIRECT',
    'OIDC_FRONTEND_URL',
    'OIDC_REQUIRE_VERIFIED_EMAIL',
    'OIDC_ROLES_CLAIM',
    'SMTP_URL',
    'MAIL_FROM',
    'MAIL_PREVIEW_DIR',
  ];
