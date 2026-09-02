export * from './lib/auth.module';
export * from './lib/auth.service';
export * from './lib/auth-events';
export * from './lib/cookies/auth-cookie.service';
export * from './lib/csrf/csrf.guard';
export * from './lib/guards/auth-throttler.guard';
export * from './lib/dto/login.dto';
export * from './lib/dto/register.dto';
export * from './lib/refresh/refresh-token.service';
export * from './lib/refresh/opaque-token';
export * from './lib/strategies/jwt.strategy';

// The authz primitives moved to `@org/backend-core` (V2.1 step 31) so the
// `user` feature can guard its own routes without depending on the auth
// brick. Re-exported here for backwards compatibility.
export type { AuthenticatedUser } from '@org/backend-core';
export {
  CurrentUser,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  Roles,
  ROLES_KEY,
  RolesGuard,
} from '@org/backend-core';
