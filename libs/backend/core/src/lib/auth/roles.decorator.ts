import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring at least one of the given roles. Read by
 * `RolesGuard`; a route with no `@Roles(...)` is left unrestricted (still
 * subject to whatever authentication guard runs before it).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
