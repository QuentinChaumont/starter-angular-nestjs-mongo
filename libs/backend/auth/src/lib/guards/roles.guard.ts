import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError } from '@org/backend-core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../models/authenticated-user';

/**
 * Authorization only — assumes a prior guard (e.g. `JwtAuthGuard`) has
 * already populated `request.user`. Not a general permissions engine: it
 * only ever checks "does the user have one of these role strings".
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const hasRole = user?.roles.some((role) => requiredRoles.includes(role)) ?? false;

    if (!hasRole) {
      throw new ForbiddenError(
        'FORBIDDEN',
        'You do not have the required role for this action',
      );
    }

    return true;
  }
}
