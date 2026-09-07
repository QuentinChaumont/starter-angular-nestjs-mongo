# Getting started — a new project from this starter

This starter ships **every brick installed and wired**. Starting a project
is: get the code, rebrand it, wire real config, drop the bricks you don't
need, then scaffold your domain.

- [`BRICKS.md`](BRICKS.md) — what each brick is and how to remove one.
- [`DESIGN.md`](DESIGN.md) — the theme / brand charter.
- [`README.md`](README.md) — the full architecture reference.

---

## 1. Get the code

**Clean copy (independent project, no upstream history):**

```bash
npx degit QuentinChaumont/starter-angular-nestjs-mongo my-project
cd my-project
git init && git add -A && git commit -m "chore: bootstrap from starter"
```

Then create an empty repo and `git remote add origin …`.

**Template / fork** — use GitHub's _Use this template_ instead if you want
to cherry-pick later starter changes (new bricks, dependency bumps).

## 2. Verify the baseline

```bash
npm install
npx nx run-many -t lint test build typecheck
npx nx sync
```

Everything must be green before you change anything.

## 3. Rebrand

| What                                                  | Where                                                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| App name (browser tab, title strategy)                | `apps/frontend/src/app/title-strategy.ts` → `APP_NAME`                                                |
| `<title>`, `<meta name="description">`, `theme-color` | `apps/frontend/src/index.html`                                                                        |
| Favicon                                               | `apps/frontend/public/favicon.ico`                                                                    |
| Brand palette (light + dark, edited together)         | `libs/frontend/design/src/lib/theme/design.config.ts` + `_tokens.scss` — see [`DESIGN.md`](DESIGN.md) |
| Root package name                                     | `package.json` → `"name"` (currently `@org/source`)                                                   |
| Copyright holder                                      | [`LICENSE`](LICENSE)                                                                                  |
| Project README                                        | replace this repo's `README.md` with your own                                                         |

The `@org/*` npm scope can stay as-is — these are private workspace
packages, never published. Renaming it is cosmetic; see the appendix.

## 4. Config & secrets

```bash
cp .env.example .env
openssl rand -base64 48        # value for JWT_SECRET
```

In `.env`, set at least: `MONGO_URI` (Atlas, or `docker compose up -d
mongo`), `JWT_SECRET`, `CORS_ORIGINS`, and `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`. Then:

```bash
npm run seed:admin
npx nx serve @org/backend      # http://localhost:3000/api
npx nx serve frontend          # http://localhost:4200
```

> **Pick `JWT_SECRET` for good now.** The TOTP (2FA) encryption key is
> derived from it — rotating `JWT_SECRET` later invalidates every enrolled
> second factor.

## 5. Legal pages

Fill the `[PLACEHOLDERS]` in the three template pages before going live:

```
libs/frontend/consent/src/lib/legal/legal-notice.page.ts
libs/frontend/consent/src/lib/legal/privacy-policy.page.ts
libs/frontend/consent/src/lib/legal/cookie-policy.page.ts
```

Set `provideConsent({ policyVersion, … })` in
`apps/frontend/src/app/app.config.ts` to match.

## 6. Drop the bricks you don't need

[`BRICKS.md`](BRICKS.md) lists every brick, its prerequisites, and every
file to unwire. After each removal:

```bash
npx nx run-many -t typecheck lint test build
npx nx e2e frontend-e2e            # if you touched the frontend
```

Nx module boundaries + `nx sync` + the type-aware lint flag dangling
references immediately.

## 7. Scaffold your domain

```bash
npx nx g @org/starter-plugin:entity invoice --crud --frontend
npx nx g @org/starter-plugin:frontend-feature reports --roles admin --icon insights
```

- `entity` — a Mongo-backed backend feature (schema / repository / service
  / controller) plus, with `--frontend`, a shared `shared/contracts` type
  and a lazy frontend feature.
- `frontend-feature` — a lazy `/app/<name>` feature (signal store, typed
  HTTP service, list + detail pages).

See [`BRICKS.md`](BRICKS.md) for the generator reference.

## 8. CI/CD & repository

- `.github/workflows/ci.yml` works as-is on GitHub — self-contained, no Nx
  Cloud token.
- Add your own deploy step. The `apps/{backend,frontend}/Dockerfile` and
  `docker-compose.yml` are provided, but the compose stack is a local
  smoke test, not a production deployment (see the Docker section of the
  README).
- `.github/dependabot.yml` — set your reviewers / labels.
- `.githooks/pre-push` (lint + typecheck on affected) is enabled by `npm
install`.

---

## Appendix — renaming the `@org/` scope

Only cosmetic; do it before writing any project code.

```bash
git commit -am wip   # safety net

grep -rl '@org/' --include='*.ts' --include='*.json' --include='*.mjs' . \
  | grep -vE 'node_modules|/dist/|out-tsc' \
  | xargs sed -i 's#@org/#@my-co/#g'
```

Then check `tsconfig.base.json` (both the `paths` map **and**
`customConditions`), re-run `npm install` and `npx nx run-many -t build`,
and review the diff (~186 files).
