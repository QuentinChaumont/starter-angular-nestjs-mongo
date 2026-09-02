import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedError } from '../http';
import { AuthenticatedUser } from './authenticated-user';

/**
 * Strict JWT guard: a missing/invalid/expired token is rejected with the
 * app's own `UnauthorizedError` (uniform error format) instead of
 * Passport/Nest's default `UnauthorizedException`.
 *
 * Needs the `jwt` Passport strategy registered — provided by the auth
 * brick's `AuthModule`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedError('UNAUTHENTICATED', 'Authentication required');
    }
    return user;
  }
}

/**
 * Lenient JWT guard: attaches `request.user` when a valid token is present,
 * and lets the request through untouched when it isn't. Bound globally by
 * the auth brick so `RolesGuard` (also global) has a `user` to check on the
 * routes that declare `@Roles(...)`, without forcing authentication on
 * every public route.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = AuthenticatedUser>(
    _err: unknown,
    user: TUser | false,
  ): TUser {
    return (user || null) as TUser;
  }
}
