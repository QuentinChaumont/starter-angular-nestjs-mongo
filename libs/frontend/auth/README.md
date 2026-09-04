# frontend-auth

Client side of authentication: local login + OIDC, an in-memory session
store, HTTP interceptors and route guards. Depends on `frontend-design`,
`frontend-i18n` and the backend `auth` brick; see
[`BRICKS.md`](../../../BRICKS.md) at the repo root to remove this brick.

## Exposes (`@org/frontend-auth`)

| Export                               | Use                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `provideAuth()`                      | Spread into `app.config.ts` — `HttpClient` + interceptors + bootstrap silent refresh.                   |
| `AuthStore`                          | Signals `user()`, `status()`, `token()`, `isAuthenticated()`.                                           |
| `AuthService`                        | `login()`, `logout()`, `refresh()`, `loadMe()`, `silentRefresh()`, `oidcProviders()`, `oidcLoginUrl()`. |
| `authGuard`, `roleGuard(...roles)`   | `CanActivateFn` route guards.                                                                           |
| `LoginPage`, `OidcCallback`          | Standalone route components (`/login`, `/auth/callback`).                                               |
| `authInterceptor`, `csrfInterceptor` | Exported for apps that own `provideHttpClient` themselves.                                              |

`AuthService.loadMe()` applies the user's stored `locale` to Transloco
(`frontend-i18n` brick) when it's one of the configured languages, so a
signed-in account sees the app in its own language after a reload.

## Session model

- **Access token: memory only** (`AuthStore`), never `localStorage`.
- **Refresh token: httpOnly cookie** — the JS never sees it. On any `401`
  from a non-auth endpoint, `authInterceptor` runs **one** shared
  `POST /auth/refresh` (concurrent 401s queue on it) and replays the
  request. On bootstrap and in `authGuard`, `silentRefresh()` restores a
  session after a reload.
- **CSRF**: `csrfInterceptor` copies the non-httpOnly `csrf-token` cookie
  into `X-CSRF-Token` on `/auth/refresh` and `/auth/logout`.
- All requests go out `withCredentials: true`.

## OIDC

`LoginPage` calls `GET /auth/oidc/providers` and renders one "Sign in with
{label}" link per active provider (none → no link); the `google` provider
also gets the official multicolour "G" mark (not recoloured, per Google's
branding guidelines). Each link is a full-page navigation to
`GET /api/auth/oidc/{id}/login`. The provider
redirects back to
`/auth/callback#access_token=…&redirect_to=…`; `OidcCallback` stores the
token, scrubs the fragment (`history.replaceState`), loads the profile and
forwards to `redirect_to`.

The profile brick's **Connected accounts** section (V2.2 step 42) reuses
these same provider routes to _link_ a provider to the already-signed-in
account (`POST /auth/identities/:id/link` → navigate to the returned
`authorizationUrl`; the callback returns to `/app/profile?linked=…`).

## Two-factor (V2.2 step 43)

When a login (password or OIDC) returns a 2FA challenge, `LoginPage` /
`OidcCallback` swap to the shared `TwoFactorPrompt` — a 6-digit code form
that posts to `POST /auth/2fa/verify` and, on success, forwards to the
intended page. `AuthService.login()` resolves to a discriminated
`LoginOutcome` (`authenticated` | `two-factor`); enrolling / disabling 2FA
lives in the profile brick.

## API base URL

Requests target `API_BASE_URL` (from `@org/frontend-core`, default `/api`).
In local dev point it at the running API:

```ts
providers: [provideApiBaseUrl('http://localhost:3000/api'), provideAuth()];
```

## Not the dashboard's business

This brick has no idea protected routes exist. The dashboard brick
(step 26) attaches `authGuard` to `/app/**`; you can also do it by hand.

## Running unit tests

`nx test frontend-auth`.
