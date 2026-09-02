/**
 * Contracts exchanged between the Angular frontend and the NestJS backend
 * for authentication (V2 step 20).
 *
 * Deliberately NOT modelled here:
 * - the refresh token — it only ever travels in an httpOnly cookie, never
 *   in a JSON body;
 * - the CSRF token — same reason (non-httpOnly cookie + request header).
 *
 * These are pure `interface` / `type` declarations. The validated request
 * DTOs (with `class-validator` decorators) live in `libs/backend/auth`.
 */

/** Body of `POST /api/auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Body of `POST /api/auth/register`. On success the response is identical to
 * `POST /api/auth/login` (access token + user, refresh cookie set), so the
 * SPA lands the new account straight into an authenticated session.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Returned by `GET /api/auth/registration` so the frontend knows whether to
 * render the "create an account" link.
 */
export interface RegistrationInfo {
  enabled: boolean;
}

/**
 * Body returned by `POST /api/auth/login` and `POST /api/auth/refresh`, and
 * carried in the fragment after the OIDC callback redirect. The access
 * token is short-lived and kept in memory by the SPA — it is never
 * persisted to `localStorage`.
 */
export interface AccessTokenResponse {
  accessToken: string;
  /** Access-token lifetime, in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * The authenticated principal, as exposed to the frontend. Mirrors what the
 * access token actually proves (`sub` + `roles`) — profile fields such as
 * `email` are not carried in the token and would come from a dedicated
 * profile endpoint if a later step needs them.
 */
export interface AuthenticatedUserDto {
  id: string;
  roles: string[];
  /**
   * `null` when the account's email is not yet verified, an ISO timestamp
   * once it is. `undefined` on the login/register responses (the access
   * token doesn't carry it) — only `GET /api/auth/me` populates it. Added
   * by the `auth-reset` brick (V2.1 step 33).
   */
  emailVerifiedAt?: string | null;
  /**
   * Profile fields — present only once `loadMe()` has hit
   * `GET /api/users/me` (the profile brick, V2.1 step 34); absent from
   * `GET /api/auth/me`.
   */
  email?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: string;
}

/** Body of `POST /api/auth/forgot-password`. Always answered `202`, whether
 * or not the address matches an account (no enumeration). */
export interface ForgotPasswordRequest {
  email: string;
}

/** Body of `POST /api/auth/reset-password`. `token` comes from the emailed
 * link; a successful reset revokes every existing session. */
export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/** Body of `POST /api/auth/verify-email`. */
export interface VerifyEmailRequest {
  token: string;
}

/** Body returned by `GET /api/auth/me`. */
export type MeResponse = AuthenticatedUserDto;

/** Query accepted by `GET /api/auth/oidc/:providerId/login`. */
export interface OidcAuthorizeQuery {
  /**
   * Relative path to land on after a successful login. Absolute URLs and
   * protocol-relative values (`//host`) are rejected server-side.
   */
  redirectTo?: string;
}

/**
 * One active OIDC provider, as listed by `GET /api/auth/oidc/providers`.
 * The frontend renders one login button per entry; an empty list means no
 * provider is configured (no button at all).
 */
export interface OidcProviderInfo {
  /** Stable id used in the login/callback route (`generic`, `google`, …). */
  id: string;
  /** Button label — rendered as `Sign in with {label}`. */
  label: string;
  /**
   * Path that starts this provider's login flow, relative to the API base
   * (`/auth/oidc/:id/login`) — the SPA prepends its configured API base.
   */
  loginUrl: string;
}
