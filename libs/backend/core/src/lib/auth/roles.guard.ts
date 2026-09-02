import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError, UnauthorizedError } from '../http';
import { AuthenticatedUser } from './authenticated-user';
import { ROLES_KEY } from './roles.decorator';

/**
 * Authorization only — assumes a prior guard (e.g. `JwtAuthGuard`, or the
 * global `OptionalJwtAuthGuard` bound by the auth brick) has already tried
 * to populate `request.user`. Not a general permissions engine: it only
 * ever checks "does the user have one of these role strings".
 *
 * A route with no `@Roles(...)` is always allowed through — so this guard
 * is safe to bind globally: it enforces exactly the routes that opt in.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    if (!user) {
      throw new UnauthorizedError(
        'UNAUTHENTICATED',
        'Authentication required',
      );
    }

    const hasRole = user.roles.some((role) => requiredRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenError(
        'FORBIDDEN',
        'You do not have the required role for this action',
      );
    }

    return true;
  }
}
