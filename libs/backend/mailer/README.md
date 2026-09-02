# backend-mailer

Optional transactional-email brick. Install it with
`nx g @org/starter-plugin:mailer`.

## What it provides

- `MailerService.send({ to, subject, text, html? })` — the single entry
  point features use. Fills in `From` from `MAIL_FROM`.
- `MailTransport` — a one-method interface. Two implementations ship:
  - **`ConsoleMailTransport`** (default) — no network, nothing to
    configure. Logs a structured `mail.sent` line via `AppLogger` and
    drops a `.eml` preview into `MAIL_PREVIEW_DIR` (default `tmp/mail`). A
    preview-write failure is warned and swallowed, never thrown.
  - **`SmtpMailTransport`** — `nodemailer` over `SMTP_URL`. Selected
    automatically when `SMTP_URL` is set.
- `InMemoryMailTransport` — captures messages for tests (override the
  `MAIL_TRANSPORT` provider with it).
- Typed templates: `renderPasswordReset({ url, expiresInMinutes })`,
  `renderEmailVerification({ url })`, `renderWelcome({ firstName })` — each
  returns `{ subject, text, html }`. No template engine; swap in
  MJML/Handlebars later if volume grows.

## SMTP (optional)

`nodemailer` is an **optional dependency** — the brick builds and runs
without it. To deliver over SMTP:

```bash
pnpm add nodemailer
# then, in .env:
SMTP_URL=smtp://user:pass@smtp.example.com:587
```

Point `SMTP_URL` at [Mailpit](https://github.com/axllent/mailpit) or
Ethereal in dev. The first `send()` that needs SMTP resolves the package
and fails with an actionable message if it is missing.

With no `SMTP_URL`, `MailerService` logs one `warn` line at startup so the
missing config isn't discovered only when a user asks for a password
reset.

## Config

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `SMTP_URL` | no | — | Set to switch from console to SMTP delivery |
| `MAIL_FROM` | no | `no-reply@localhost` | `From` address |
| `MAIL_PREVIEW_DIR` | no | `tmp/mail` | Where the console transport writes `.eml` previews |

## Running unit tests

Run `nx test backend-mailer` to execute the unit tests via [Jest](https://jestjs.io).
