/**
 * Contracts for role management (V2.2 step 44). Roles stay **name-based** —
 * `RolesGuard` still compares `@Roles('admin')` against `user.roles`
 * strings. This collection is just the editable catalogue the admin console
 * offers; there is no permission engine.
 */
import type { PaginatedResponse } from './pagination.js';

/** A role in the catalogue, as returned by `GET /api/roles`. */
export interface Role {
  id: string;
  /** Unique, lowercase, no spaces — the string stored in `user.roles`. */
  name: string;
  description: string | null;
  /**
   * `true` for roles the app itself depends on (`admin`). System roles
   * can't be renamed or deleted through the CRUD (`409
   * ROLE_SYSTEM_PROTECTED`).
   */
  system: boolean;
  createdAt: string;
  updatedAt: string;
}

/** `GET /api/roles?page=&pageSize=&search=&sort=&dir=` — admin-only. */
export type PaginatedRoles = PaginatedResponse<Role>;

/** Body of `POST /api/roles`. */
export interface CreateRoleRequest {
  name: string;
  description?: string;
}

/** Body of `PATCH /api/roles/:id`. `name` is rejected for a system role. */
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}
