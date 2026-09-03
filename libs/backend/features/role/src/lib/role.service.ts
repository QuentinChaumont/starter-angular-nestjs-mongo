import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import type { PaginatedResponse, Role as RoleDto } from '@org/shared-contracts';
import { RoleRepository } from './role.repository';
import { RoleDocument } from './role.schema';

/** Roles the app itself relies on — always present, never editable. */
export const SYSTEM_ROLES = ['admin'] as const;

const MONGO_DUPLICATE_KEY_CODE = 11000;
const NAME_PATTERN = /^[a-z][a-z0-9_-]*$/;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === MONGO_DUPLICATE_KEY_CODE
  );
}

export function toRole(role: RoleDocument): RoleDto {
  return {
    id: role._id.toString(),
    name: role.name,
    description: role.description ?? null,
    system: role.system,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

/** Whitelisted `?sort=` values → the Mongo field. */
const ROLE_SORT_FIELDS = {
  name: 'name',
  createdAt: 'createdAt',
} as const;

@Injectable()
export class RoleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly repository: RoleRepository,
    private readonly users: UserService,
  ) {}

  /** Idempotently seeds the protected system roles (`admin`) — replaces a
   * dedicated seed script (V2.2 step 44). */
  async onApplicationBootstrap(): Promise<void> {
    for (const name of SYSTEM_ROLES) {
      const existing = await this.repository.findByName(name);
      if (!existing) {
        await this.repository.create({ name, system: true });
        this.logger.log(`Seeded system role "${name}"`);
      } else if (!existing.system) {
        existing.system = true;
        await existing.save();
      }
    }
  }

  /* ---- CRUD (admin console) ---- */

  async list(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    dir?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<RoleDto>> {
    const search = query.search?.trim();
    const filter = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { description: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : {};

    const sortField =
      ROLE_SORT_FIELDS[query.sort as keyof typeof ROLE_SORT_FIELDS] ?? 'name';
    const sort: Record<string, 1 | -1> = {
      [sortField]: query.dir === 'desc' ? -1 : 1,
    };

    const page = await this.repository.findPage(
      filter,
      { page: query.page, pageSize: query.pageSize },
      sort,
    );
    return { ...page, items: page.items.map(toRole) };
  }

  async findById(id: string): Promise<RoleDto> {
    return toRole(await this.require(id));
  }

  async create(input: {
    name: string;
    description?: string;
  }): Promise<RoleDto> {
    const name = normalizeName(input.name);
    try {
      const created = await this.repository.create({
        name,
        description: input.description?.trim() || undefined,
        system: false,
      });
      return toRole(created);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError(
          'ROLE_ALREADY_EXISTS',
          `A role named "${name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    update: { name?: string; description?: string },
  ): Promise<RoleDto> {
    const role = await this.require(id);

    if (update.name !== undefined) {
      const name = normalizeName(update.name);
      if (name !== role.name) {
        if (role.system) {
          throw new ConflictError(
            'ROLE_SYSTEM_PROTECTED',
            `The "${role.name}" role cannot be renamed`,
          );
        }
        role.name = name;
      }
    }
    if (update.description !== undefined) {
      role.description = update.description.trim() || undefined;
    }

    try {
      await role.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictError(
          'ROLE_ALREADY_EXISTS',
          'A role with this name already exists',
        );
      }
      throw error;
    }
    return toRole(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.require(id);
    if (role.system) {
      throw new ConflictError(
        'ROLE_SYSTEM_PROTECTED',
        `The "${role.name}" role cannot be deleted`,
      );
    }
    const inUse = await this.users.countByRole(role.name);
    if (inUse > 0) {
      throw new ConflictError(
        'ROLE_IN_USE',
        `"${role.name}" is still assigned to ${inUse} user(s) — remove it from them first`,
      );
    }
    await this.repository.deleteById(id);
  }

  private async require(id: string): Promise<RoleDocument> {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundError('ROLE_NOT_FOUND', 'Role not found');
    }
    return found;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeName(raw: string): string {
  const name = raw.trim().toLowerCase();
  if (!NAME_PATTERN.test(name)) {
    throw new ValidationError(
      'INVALID_ROLE_NAME',
      'A role name must be lowercase letters, digits, "-" or "_", starting with a letter',
    );
  }
  return name;
}
