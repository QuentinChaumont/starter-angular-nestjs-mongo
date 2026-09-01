# frontend-auth

Client side of authentication: local login + OIDC, an in-memory session
store, HTTP interceptors and route guards. Install with
`nx g @org/starter-plugin:frontend-auth` (needs `frontend-design` and the
backend `auth` brick).

## Exposes (`@org/frontend-auth`)

| Export | Use |
| --- | --- |
| `provideAuth()` | Spread into `app.config.ts` — `HttpClient` + interceptors + bootstrap silent refresh. |
| `AuthStore` | Signals `user()`, `status()`, `token()`, `isAuthenticated()`. |
| `AuthService` | `login()`, `logout()`, `refresh()`, `loadMe()`, `silentRefresh()`, `oidcProvider()`, `oidcLoginUrl()`. |
| `authGuard`, `roleGuard(...roles)` | `CanActivateFn` route guards. |
| `LoginPage`, `OidcCallback` | Standalone route components (`/login`, `/auth/callback`). |
| `authInterceptor`, `csrfInterceptor` | Exported for apps that own `provideHttpClient` themselves. |

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

`LoginPage` calls `GET /auth/oidc/provider` and shows the "Sign in with
SSO" link only when `enabled`. The link is a full-page navigation to
`GET /api/auth/oidc/login`. The provider redirects back to
`/auth/callback#access_token=…&redirect_to=…`; `OidcCallback` stores the
token, scrubs the fragment (`history.replaceState`), loads the profile and
forwards to `redirect_to`.

## API base URL

Requests target `API_BASE_URL` (from `@org/frontend-core`, default `/api`).
In local dev point it at the running API:

```ts
providers: [provideApiBaseUrl('http://localhost:3000/api'), provideAuth()]
```

## Not the dashboard's business

This brick has no idea protected routes exist. The dashboard brick
(step 26) attaches `authGuard` to `/app/**`; you can also do it by hand.

## Running unit tests

`nx test frontend-auth`.
