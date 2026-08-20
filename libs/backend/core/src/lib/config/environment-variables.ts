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
}
