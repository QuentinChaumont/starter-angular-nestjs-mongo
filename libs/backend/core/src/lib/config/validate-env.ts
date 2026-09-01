import {
  EnvironmentVariables,
  NODE_ENVIRONMENTS,
  NodeEnvironment,
} from './environment-variables';

const DEFAULT_NODE_ENV: NodeEnvironment = 'development';
const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGINS = ['http://localhost:4200'];
const DEFAULT_RATE_LIMIT_TTL_SECONDS = 60;
const DEFAULT_RATE_LIMIT_LIMIT = 100;

const MIN_PORT = 1;
const MAX_PORT = 65535;

function parseNodeEnv(raw: unknown, errors: string[]): NodeEnvironment {
  if (raw === undefined || raw === '') {
    return DEFAULT_NODE_ENV;
  }

  if (NODE_ENVIRONMENTS.includes(raw as NodeEnvironment)) {
    return raw as NodeEnvironment;
  }

  errors.push(
    `NODE_ENV must be one of ${NODE_ENVIRONMENTS.join(', ')}, received "${String(raw)}"`,
  );
  return DEFAULT_NODE_ENV;
}

function parsePort(raw: unknown, errors: string[]): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    errors.push(
      `PORT must be an integer between ${MIN_PORT} and ${MAX_PORT}, received "${String(raw)}"`,
    );
    return DEFAULT_PORT;
  }

  return port;
}

function parsePositiveInt(
  key: string,
  raw: unknown,
  defaultValue: number,
  errors: string[],
): number {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    errors.push(`${key} must be a positive integer, received "${String(raw)}"`);
    return defaultValue;
  }

  return value;
}

function parseCorsOrigins(raw: unknown): string[] {
  if (raw === undefined || raw === '') {
    return DEFAULT_CORS_ORIGINS;
  }

  const origins = String(raw)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
}

function parseOptionalString(
  key: string,
  raw: unknown,
  errors: string[],
): string | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }

  const value = String(raw).trim();
  if (value.length === 0) {
    errors.push(`${key} must not be empty when provided`);
    return undefined;
  }

  return value;
}

function parseOptionalBoolean(
  key: string,
  raw: unknown,
  errors: string[],
): boolean | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }

  if (typeof raw === 'boolean') {
    return raw;
  }

  const value = String(raw).trim().toLowerCase();
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }

  errors.push(
    `${key} must be a boolean (true/false), received "${String(raw)}"`,
  );
  return undefined;
}

export function validateEnv(
  rawEnv: Record<string, unknown>,
): EnvironmentVariables {
  const errors: string[] = [];

  const NODE_ENV = parseNodeEnv(rawEnv['NODE_ENV'], errors);
  const PORT = parsePort(rawEnv['PORT'], errors);
  const CORS_ORIGINS = parseCorsOrigins(rawEnv['CORS_ORIGINS']);
  const RATE_LIMIT_TTL_SECONDS = parsePositiveInt(
    'RATE_LIMIT_TTL_SECONDS',
    rawEnv['RATE_LIMIT_TTL_SECONDS'],
    DEFAULT_RATE_LIMIT_TTL_SECONDS,
    errors,
  );
  const RATE_LIMIT_LIMIT = parsePositiveInt(
    'RATE_LIMIT_LIMIT',
    rawEnv['RATE_LIMIT_LIMIT'],
    DEFAULT_RATE_LIMIT_LIMIT,
    errors,
  );
  const MONGO_URI = parseOptionalString('MONGO_URI', rawEnv['MONGO_URI'], errors);
  const JWT_SECRET = parseOptionalString('JWT_SECRET', rawEnv['JWT_SECRET'], errors);
  const JWT_EXPIRES_IN = parseOptionalString(
    'JWT_EXPIRES_IN',
    rawEnv['JWT_EXPIRES_IN'],
    errors,
  );
  const REFRESH_EXPIRES_IN = parseOptionalString(
    'REFRESH_EXPIRES_IN',
    rawEnv['REFRESH_EXPIRES_IN'],
    errors,
  );
  const AUTH_COOKIE_SECURE = parseOptionalBoolean(
    'AUTH_COOKIE_SECURE',
    rawEnv['AUTH_COOKIE_SECURE'],
    errors,
  );

  const OIDC_ISSUER = parseOptionalString(
    'OIDC_ISSUER',
    rawEnv['OIDC_ISSUER'],
    errors,
  );
  const OIDC_CLIENT_ID = parseOptionalString(
    'OIDC_CLIENT_ID',
    rawEnv['OIDC_CLIENT_ID'],
    errors,
  );
  const OIDC_CLIENT_SECRET = parseOptionalString(
    'OIDC_CLIENT_SECRET',
    rawEnv['OIDC_CLIENT_SECRET'],
    errors,
  );
  const OIDC_REDIRECT_URI = parseOptionalString(
    'OIDC_REDIRECT_URI',
    rawEnv['OIDC_REDIRECT_URI'],
    errors,
  );
  const OIDC_SCOPES = parseOptionalString(
    'OIDC_SCOPES',
    rawEnv['OIDC_SCOPES'],
    errors,
  );
  const OIDC_POST_LOGIN_REDIRECT = parseOptionalString(
    'OIDC_POST_LOGIN_REDIRECT',
    rawEnv['OIDC_POST_LOGIN_REDIRECT'],
    errors,
  );
  const OIDC_FRONTEND_URL = parseOptionalString(
    'OIDC_FRONTEND_URL',
    rawEnv['OIDC_FRONTEND_URL'],
    errors,
  );
  const OIDC_REQUIRE_VERIFIED_EMAIL = parseOptionalBoolean(
    'OIDC_REQUIRE_VERIFIED_EMAIL',
    rawEnv['OIDC_REQUIRE_VERIFIED_EMAIL'],
    errors,
  );
  const OIDC_ROLES_CLAIM = parseOptionalString(
    'OIDC_ROLES_CLAIM',
    rawEnv['OIDC_ROLES_CLAIM'],
    errors,
  );

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors.map((error) => `  - ${error}`).join('\n')}`,
    );
  }

  return {
    NODE_ENV,
    PORT,
    CORS_ORIGINS,
    RATE_LIMIT_TTL_SECONDS,
    RATE_LIMIT_LIMIT,
    ...(MONGO_URI !== undefined ? { MONGO_URI } : {}),
    ...(JWT_SECRET !== undefined ? { JWT_SECRET } : {}),
    ...(JWT_EXPIRES_IN !== undefined ? { JWT_EXPIRES_IN } : {}),
    ...(REFRESH_EXPIRES_IN !== undefined ? { REFRESH_EXPIRES_IN } : {}),
    ...(AUTH_COOKIE_SECURE !== undefined ? { AUTH_COOKIE_SECURE } : {}),
    ...(OIDC_ISSUER !== undefined ? { OIDC_ISSUER } : {}),
    ...(OIDC_CLIENT_ID !== undefined ? { OIDC_CLIENT_ID } : {}),
    ...(OIDC_CLIENT_SECRET !== undefined ? { OIDC_CLIENT_SECRET } : {}),
    ...(OIDC_REDIRECT_URI !== undefined ? { OIDC_REDIRECT_URI } : {}),
    ...(OIDC_SCOPES !== undefined ? { OIDC_SCOPES } : {}),
    ...(OIDC_POST_LOGIN_REDIRECT !== undefined
      ? { OIDC_POST_LOGIN_REDIRECT }
      : {}),
    ...(OIDC_FRONTEND_URL !== undefined ? { OIDC_FRONTEND_URL } : {}),
    ...(OIDC_REQUIRE_VERIFIED_EMAIL !== undefined
      ? { OIDC_REQUIRE_VERIFIED_EMAIL }
      : {}),
    ...(OIDC_ROLES_CLAIM !== undefined ? { OIDC_ROLES_CLAIM } : {}),
  };
}
