import { Injectable } from '@nestjs/common';
import { ValidationError } from '@org/backend-core';
import type { RoleCatalog } from '@org/backend-features-user';
import { RoleRepository } from './role.repository';

/**
 * The `ROLE_CATALOG` implementation the `user` brick injects (V2.2 step
 * 44). Kept separate from `RoleService` so it depends on nothing but the
 * repository — `RoleService` → `UserService` → `ROLE_CATALOG` would
 * otherwise be a DI cycle.
 */
@Injectable()
export class RoleCatalogService implements RoleCatalog {
  constructor(private readonly repository: RoleRepository) {}

  async assertAllExist(names: string[]): Promise<void> {
    const unique = [...new Set(names)];
    const known = await this.repository.existingNames(unique);
    const missing = unique.filter((name) => !known.includes(name));
    if (missing.length > 0) {
      throw new ValidationError(
        'UNKNOWN_ROLE',
        `Unknown role(s): ${missing.join(', ')}`,
      );
    }
  }
}
