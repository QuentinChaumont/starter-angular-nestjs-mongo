# backend-auth

Optional JWT auth brick. Install it with `nx g @org/starter-plugin:auth`
(requires the Mongo brick and a `user --crud` entity).

## What it provides

- `POST /auth/login` — email + password → short-lived **access token** in
  the JSON body (`{ accessToken, expiresIn, tokenType, user }`), plus two
  cookies (see below).
- `POST /auth/refresh` — rotates the refresh token and returns a new access
  token. Guarded by `CsrfGuard`.
- `POST /auth/logout` — revokes the current refresh token, clears the
  cookies. `204`. Guarded by `CsrfGuard`.
- `GET /auth/me` — the current `AuthenticatedUser` (`JwtAuthGuard`).
- `JwtAuthGuard`, `RolesGuard` + `@Roles(...)`, `@CurrentUser()`.
- `RefreshTokenService.revokeAllForUser(userId)` — building block for a
  future "sign out everywhere" (not wired to a route).

## Session model

- **Access token**: JWT, `JWT_EXPIRES_IN` (default `15m`). Returned in the
  body; the SPA keeps it in memory only.
- **Refresh token**: opaque random string, stored **hashed** (SHA-256) in
  the `refresh_tokens` collection. Sent as an `httpOnly` cookie
  (`refresh_token`), scoped to `/api/auth`, `SameSite=Lax`,
  `Secure` in production (override with `AUTH_COOKIE_SECURE`). Lifetime:
  `REFRESH_EXPIRES_IN` (default `30d`).
- **Rotation**: every refresh issues a new token in the same `family` and
  revokes the old one. Presenting an already-rotated token is treated as a
  leak — the whole family is revoked and the call fails `401`
  (`REFRESH_TOKEN_REUSED`).
- **CSRF**: `refresh`/`logout` rely only on the cookie, so they're
  protected by a double-submit token — a non-`httpOnly` `csrf-token`
  cookie the SPA copies into the `X-CSRF-Token` header.
- **Cleanup**: a Mongo TTL index drops expired rows; rotation also prunes
  the current user's expired rows.

Cookies are read with a tiny internal `Cookie:` header parser
(`cookies/parse-cookies.ts`) and set with Express's native `res.cookie()` —
no `cookie-parser` dependency, nothing to wire into `main.ts`.

## OIDC login (optional)

Ships with the brick, **inert until configured**. Set `OIDC_ISSUER`,
`OIDC_CLIENT_ID` and `OIDC_REDIRECT_URI` to enable it — local login keeps
working alongside.

- `GET /auth/oidc/provider` → `{ enabled, loginUrl }`; the SPA shows the
  "sign in with OIDC" button only when `enabled`.
- `GET /auth/oidc/login?redirectTo=/app/...` → Authorization Code + PKCE
  redirect. `state` / `nonce` / `code_verifier` are stored in a short-lived
  httpOnly `oidc_tx` cookie.
- `GET /auth/oidc/callback` → validates `state`, exchanges the code
  (`openid-client`), links the user **by verified email**
  (`OidcUserLinker`: reuse an existing account, else create a passwordless
  one), issues the same access token + session cookies as local login,
  then redirects to `OIDC_FRONTEND_URL + redirectTo` with
  `#access_token=...&expires_in=...&token_type=Bearer` in the fragment.

The provider's own tokens never leave the backend. `redirectTo` is
constrained to a single-slash relative path.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `OIDC_ISSUER` | to enable | — | Discovery URL |
| `OIDC_CLIENT_ID` | to enable | — | |
| `OIDC_REDIRECT_URI` | to enable | — | `.../api/auth/oidc/callback` |
| `OIDC_CLIENT_SECRET` | no | — | Omit for a public client (PKCE only) |
| `OIDC_SCOPES` | no | `openid profile email` | |
| `OIDC_FRONTEND_URL` | no | `http://localhost:4200` | Base of the post-login redirect |
| `OIDC_POST_LOGIN_REDIRECT` | no | `/app` | Default relative landing path |
| `OIDC_REQUIRE_VERIFIED_EMAIL` | no | `true` | Reject unverified provider emails |
| `OIDC_ROLES_CLAIM` | no | — | Dot-path to a `string[]` claim → user roles |

## Config

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `JWT_SECRET` | yes (when installed) | — | |
| `JWT_EXPIRES_IN` | no | `15m` | Access-token lifetime |
| `REFRESH_EXPIRES_IN` | no | `30d` | Refresh-token lifetime |
| `AUTH_COOKIE_SECURE` | no | `true` in production, else `false` | Allows http in dev |

## Running unit tests

Run `nx test backend-auth` to execute the unit tests via [Jest](https://jestjs.io).
