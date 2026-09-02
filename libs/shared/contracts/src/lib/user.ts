/**
 * Contracts for the connected account's own profile (V2.1 step 34) and for
 * the admin console that manages *other* users (step 35).
 */
import type { PaginatedResponse } from './pagination.js';

/** Body of `GET /api/users/me` and `PATCH /api/users/me`. */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  /** `null` until the email address is verified, an ISO timestamp after. */
  emailVerifiedAt: string | null;
  /** ISO timestamp. */
  createdAt: string;
}

/** Body of `PATCH /api/users/me`. Changing the `email` clears its verified
 * status and (with the `auth-reset` brick) triggers a new verification
 * email to the new address. */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** Body of `POST /api/auth/change-password`. A successful change revokes
 * every *other* session; the calling one keeps working. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Body of `DELETE /api/users/me`. Permanently deletes the connected
 * account after re-confirming the password. */
export interface DeleteAccountRequest {
  password: string;
}

/* ---- admin console (step 35) — every route below is admin-only ---- */

/** One row in `GET /api/users` (paginated). */
export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  emailVerifiedAt: string | null;
  /** ISO timestamp once the account is disabled, else `null`. A disabled
   * account can't `login` or `refresh`. */
  disabledAt: string | null;
  createdAt: string;
}

/** `GET /api/users?page=&pageSize=&search=` → newest first. */
export type PaginatedUsers = PaginatedResponse<UserSummary>;

/** Body of `PATCH /api/users/:id/roles`. Removing `admin` from the last
 * admin is refused (`400 LAST_ADMIN`). */
export interface UpdateRolesRequest {
  roles: string[];
}

/** Body of `PATCH /api/users/:id/status`. Disabling revokes the account's
 * sessions. */
export interface UpdateStatusRequest {
  active: boolean;
}
