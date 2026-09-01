export const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  CORS_ORIGINS: string[];
  RATE_LIMIT_TTL_SECONDS: number;
  RATE_LIMIT_LIMIT: number;
  MONGO_URI?: string;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  REFRESH_EXPIRES_IN?: string;
  AUTH_COOKIE_SECURE?: boolean;
  OIDC_ISSUER?: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  OIDC_REDIRECT_URI?: string;
  OIDC_SCOPES?: string;
  OIDC_POST_LOGIN_REDIRECT?: string;
  OIDC_FRONTEND_URL?: string;
  OIDC_REQUIRE_VERIFIED_EMAIL?: boolean;
  OIDC_ROLES_CLAIM?: string;
}
