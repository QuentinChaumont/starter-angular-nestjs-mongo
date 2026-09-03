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
  cookie (path `/`, so the SPA can read it from any route) the SPA copies
  into the `X-CSRF-Token` header. A missing/mismatched token is a `401`
  (`CSRF_TOKEN_INVALID`).
- **Cleanup**: a Mongo TTL index drops expired rows; rotation also prunes
  the current user's expired rows.

Cookies are read with a tiny internal `Cookie:` header parser
(`cookies/parse-cookies.ts`) and set with Express's native `res.cookie()` —
no `cookie-parser` dependency, nothing to wire into `main.ts`.

## OIDC login (optional)

Ships with the brick, **inert until configured**. Set `OIDC_ISSUER`,
`OIDC_CLIENT_ID` and `OIDC_REDIRECT_URI` to enable the built-in `generic`
provider — local login keeps working alongside.

The routes are **per provider** (`:providerId` ∈ `generic`, `google`,
`keycloak`):

- `GET /auth/oidc/providers` → `{ id, label, loginUrl }[]`; the SPA renders
  one "Sign in with {label}" button per entry (empty list → no button).
- `GET /auth/oidc/:providerId/login?redirectTo=/app/...` → Authorization
  Code + PKCE redirect. `providerId` / `state` / `nonce` / `code_verifier`
  are stored in a short-lived httpOnly `oidc_tx` cookie. Unknown id → 404
  `OIDC_PROVIDER_UNKNOWN`.
- `GET /auth/oidc/:providerId/callback` → checks the cookie's `providerId`
  and `state`, exchanges the code (`openid-client`), resolves the account
  (`OidcUserLinker`, see **Connected accounts** below), issues the same
  access token + session cookies as local login, then redirects to
  `OIDC_FRONTEND_URL + redirectTo` with
  `#access_token=...&expires_in=...&token_type=Bearer` in the fragment.

The provider's own tokens never leave the backend. `redirectTo` is
constrained to a single-slash relative path.

## Connected accounts (V2.2 step 42)

A single account can hold several login methods at once — a local password
**and** any of the OIDC providers. The link lives in the `identities`
collection (`{ userId, provider, subject, email, linkedAt }`, unique on
`(provider, subject)`), not on the user's email.

On an OIDC callback `OidcUserLinker` resolves, in order: an existing
`identities` row for this `(provider, subject)`; else an account with the
same **verified email** (a new identity is linked to it — this also
migrates pre-step-42 accounts on their next login); else a new
**passwordless** account plus its first identity. A passwordless account
sets a local password later via "forgot password".

Endpoints (all bearer-authenticated, no CSRF guard — like
`change-password`):

- `GET /auth/identities` → `{ hasPassword, identities: { provider, label,
  email, linkedAt }[] }` for the current account.
- `POST /auth/identities/:providerId/link` → `{ authorizationUrl }`. The
  SPA navigates there; the callback (recognising the `oidc_tx` cookie's
  `linkUserId`) links the identity to the signed-in account and bounces to
  `/app/profile?linked=<id>` (or `?linkError=<code>`), **without** opening
  a new session. Linking an identity already owned by another account →
  `409 IDENTITY_ALREADY_LINKED`.
- `DELETE /auth/identities/:providerId` → `204`. `404 IDENTITY_NOT_FOUND`
  if it isn't linked; `409 LAST_LOGIN_METHOD` if it's the only way in (no
  password, no other identity).

| Variable                      | Required  | Default                 | Notes                                       |
| ----------------------------- | --------- | ----------------------- | ------------------------------------------- |
| `OIDC_ISSUER`                 | to enable | —                       | Discovery URL                               |
| `OIDC_CLIENT_ID`              | to enable | —                       |                                             |
| `OIDC_REDIRECT_URI`           | to enable | —                       | `.../api/auth/oidc/generic/callback`        |
| `OIDC_CLIENT_SECRET`          | no        | —                       | Omit for a public client (PKCE only)        |
| `OIDC_SCOPES`                 | no        | `openid profile email`  |                                             |
| `OIDC_FRONTEND_URL`           | no        | `http://localhost:4200` | Base of the post-login redirect             |
| `OIDC_POST_LOGIN_REDIRECT`    | no        | `/app`                  | Default relative landing path               |
| `OIDC_REQUIRE_VERIFIED_EMAIL` | no        | `true`                  | Reject unverified provider emails           |
| `OIDC_ROLES_CLAIM`           | no        | —                       | Dot-path to a `string[]` claim → user roles |

### Google preset

Google is a **preset**: issuer (`https://accounts.google.com`) and scopes
(`openid profile email`) are fixed, you only bring an OAuth client.

| Variable                    | Required     | Notes                                                        |
| --------------------------- | ------------ | ----------------------------------------------------------- |
| `OIDC_GOOGLE_CLIENT_ID`     | to enable    | Both id + secret needed, else no Google button              |
| `OIDC_GOOGLE_CLIENT_SECRET` | to enable    |                                                            |

The callback URI is derived from `OIDC_REDIRECT_URI` (id segment swapped to
`google`), so `OIDC_REDIRECT_URI` must be set even for a Google-only setup.

**Google Cloud Console** → _APIs & Services_ → _Credentials_ →
_Create credentials_ → _OAuth client ID_:

1. Application type **Web application**.
2. _Authorized JavaScript origins_: your API origin (e.g.
   `http://localhost:3000`).
3. _Authorized redirect URIs_: `<origin>/api/auth/oidc/google/callback`
   (e.g. `http://localhost:3000/api/auth/oidc/google/callback`).
4. Copy the generated client id + secret into `OIDC_GOOGLE_CLIENT_ID` /
   `OIDC_GOOGLE_CLIENT_SECRET`.

Google always asserts `email_verified`, so the shared
`OIDC_REQUIRE_VERIFIED_EMAIL` default (on) applies unchanged. No E2E — the
flow needs a real Google account (test manually once).

### Keycloak preset

Points at an **existing** realm — the starter bundles no Keycloak
container (add your own in `docker-compose.override.yml` to test locally).

| Variable                     | Required  | Default              | Notes                                             |
| ---------------------------- | --------- | -------------------- | ------------------------------------------------ |
| `OIDC_KEYCLOAK_ISSUER`       | to enable | —                    | `https://<host>/realms/<realm>`                   |
| `OIDC_KEYCLOAK_CLIENT_ID`    | to enable | —                    |                                                  |
| `OIDC_KEYCLOAK_CLIENT_SECRET`| no        | —                    | Omit for a public client (PKCE only)             |
| `OIDC_KEYCLOAK_ROLES_CLAIM`  | no        | `realm_access.roles` | Realm roles → local roles, **at account creation only** |
| `OIDC_KEYCLOAK_LABEL`        | no        | `Keycloak`           | Login-button label                               |

Callback URI is derived from `OIDC_REDIRECT_URI` (id segment → `keycloak`),
so set `OIDC_REDIRECT_URI` even for a Keycloak-only setup.

**In Keycloak** (_Clients_ → _Create client_):

1. Client type **OpenID Connect**, client authentication **On** for a
   confidential client (set `OIDC_KEYCLOAK_CLIENT_SECRET` from
   _Credentials_) or **Off** for public + PKCE (leave the secret unset).
2. _Valid redirect URIs_: `<api-origin>/api/auth/oidc/keycloak/callback`.
3. Realm roles land in `realm_access.roles` of the id-token by default
   (Keycloak ships the mapper). Point `OIDC_KEYCLOAK_ROLES_CLAIM` elsewhere
   (e.g. `resource_access.<client>.roles`) if you use a client-roles
   mapper instead.

Roles are copied onto the local account **once**, when it is first
created — later logins do not re-sync (the local role CRUD is the source of
truth after that). No CI/E2E — needs an external Keycloak; verify once
manually against `quay.io/keycloak/keycloak`.

## Config

| Variable             | Required             | Default                            | Notes                  |
| -------------------- | -------------------- | ---------------------------------- | ---------------------- |
| `JWT_SECRET`         | yes (when installed) | —                                  |                        |
| `JWT_EXPIRES_IN`     | no                   | `15m`                              | Access-token lifetime  |
| `REFRESH_EXPIRES_IN` | no                   | `30d`                              | Refresh-token lifetime |
| `AUTH_COOKIE_SECURE` | no                   | `true` in production, else `false` | Allows http in dev     |

## Running unit tests

Run `nx test backend-auth` to execute the unit tests via [Jest](https://jestjs.io).
