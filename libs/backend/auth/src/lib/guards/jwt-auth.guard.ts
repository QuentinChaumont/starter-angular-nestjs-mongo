import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedError } from '@org/backend-core';
import { AuthenticatedUser } from '../models/authenticated-user';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Routes a missing/invalid/expired token through the app's own
   * `UnauthorizedError` (uniform error format from Step 4) instead of
   * Passport/Nest's default `UnauthorizedException`.
   */
  override handleRequest<TUser = AuthenticatedUser>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedError(
        'UNAUTHENTICATED',
        'Authentication required',
      );
    }
    return user;
  }
}
