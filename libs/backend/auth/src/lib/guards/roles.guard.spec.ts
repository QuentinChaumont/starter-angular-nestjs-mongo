import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../models/authenticated-user';
import { RolesGuard } from './roles.guard';

function buildContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function buildGuard(requiredRoles: string[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('allows access when no roles are required', () => {
    const guard = buildGuard(undefined);
    const context = buildContext({ id: 'u1', roles: [] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user has one of the required roles', () => {
    const guard = buildGuard(['admin']);
    const context = buildContext({ id: 'u1', roles: ['admin', 'editor'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access with a ForbiddenError when the user lacks the role', () => {
    const guard = buildGuard(['admin']);
    const context = buildContext({ id: 'u1', roles: ['editor'] });

    expect(() => guard.canActivate(context)).toThrow(/required role/);
  });

  it('denies access when there is no authenticated user at all', () => {
    const guard = buildGuard(['admin']);
    const context = buildContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(/required role/);
  });
});
