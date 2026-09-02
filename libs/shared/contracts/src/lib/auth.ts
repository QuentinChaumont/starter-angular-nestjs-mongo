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
}

/** Body returned by `GET /api/auth/me`. */
export type MeResponse = AuthenticatedUserDto;

/** Query accepted by `GET /api/auth/oidc/login`. */
export interface OidcAuthorizeQuery {
  /**
   * Relative path to land on after a successful login. Absolute URLs and
   * protocol-relative values (`//host`) are rejected server-side.
   */
  redirectTo?: string;
}

/**
 * Returned by `GET /api/auth/oidc/provider` so the frontend knows whether
 * to render the "sign in with OIDC" button, and where it points.
 */
export interface OidcProviderInfo {
  enabled: boolean;
  /** URL that starts the OIDC login flow (`GET /api/auth/oidc/login`). */
  loginUrl: string;
}
