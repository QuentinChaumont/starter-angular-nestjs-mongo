# backend-auth-reset

Optional brick: **forgot password / reset** + **email verification**.
Install with `nx g @org/starter-plugin:auth-reset` (needs the `auth` and
`mailer` bricks).

## Endpoints

| Route                                                 | Auth   | Notes                                                                                                                                                                                           |
| ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/forgot-password` `{ email }`          | —      | Always `202`, no account enumeration. Emails a reset link if the account exists.                                                                                                                |
| `POST /api/auth/reset-password` `{ token, password }` | —      | `400` on a bad/expired/used token. Revokes **every** session on success.                                                                                                                        |
| `POST /api/auth/verify-email` `{ token }`             | —      | Stamps `emailVerifiedAt`.                                                                                                                                                                       |
| `POST /api/auth/resend-verification`                  | Bearer | Re-issues a verification link for the current user. Per-account cooldown (`VERIFICATION_RESEND_COOLDOWN_SECONDS`, default 300) → `429 VERIFICATION_RESEND_COOLDOWN` (the sign-up email counts). |

All four sit behind the dedicated `AuthThrottlerGuard` (same limits as
`login` / `register`); `resend-verification` adds the per-account cooldown
above so one account can't be used to spray mail.

## Tokens

Opaque, 32-byte random strings, stored **hashed** (SHA-256) in
`password_reset_tokens` / `email_verification_tokens`. Single-use, TTL'd
(`RESET_TOKEN_TTL_MINUTES` default 60, `VERIFICATION_TOKEN_TTL_HOURS`
default 24), swept by a Mongo TTL index. A password reset also invalidates
the user's other outstanding reset links.

## Email verification

On registration the base `auth` brick emits a `user.registered` event
(`AuthEvents`); this brick listens and sends the verification email.
Verification is **soft** by default — the account works immediately, the
SPA shows a "verify your email" banner. Set
`AUTH_REQUIRE_VERIFIED_EMAIL=true` to make `POST /auth/login` return
`403 EMAIL_NOT_VERIFIED` until the address is confirmed.

## Config

| Variable                               | Default | Notes                                                                    |
| -------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `AUTH_REQUIRE_VERIFIED_EMAIL`          | `false` | Hard-gate login on a verified email                                      |
| `RESET_TOKEN_TTL_MINUTES`              | `60`    | Reset-link lifetime                                                      |
| `VERIFICATION_TOKEN_TTL_HOURS`         | `24`    | Verification-link lifetime                                               |
| `VERIFICATION_RESEND_COOLDOWN_SECONDS` | `300`   | Min delay between two manual `resend-verification` calls for one account |

Reset / verification links point at `CORS_ORIGINS[0]` +
`/reset-password?token=…` / `/verify-email?token=…`.

When `SMTP_URL` is unset (console transport), each reset / verification
link is also written to the app log on its own `warn` line — so a local
flow is never blocked waiting for an inbox. Silent once real SMTP is
configured.
