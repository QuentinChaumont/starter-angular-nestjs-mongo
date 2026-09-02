/**
 * Contracts for the connected account's own profile (V2.1 step 34).
 * Administration of *other* users is a separate concern (step 35).
 */

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
