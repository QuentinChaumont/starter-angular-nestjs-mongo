# frontend-consent

Cookie / tracker consent: a non-blocking banner on first visit, a
preferences dialog, a persisted decision, and a gate for third-party tags.
Install with `nx g @org/starter-plugin:frontend-consent` (needs
`frontend-design`).

## Exposes (`@org/frontend-consent`)

| Export                          | Use                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `provideConsent(config?)`       | Spread into `app.config.ts`. Override `policyVersion`, `categories`, `expiresInDays`, legal routes.                        |
| `ConsentBanner`                 | `<lib-consent-banner>` — mount once in `app.ts`, outside the router outlet.                                                |
| `ConsentService`                | `hasDecided()`, `bannerVisible()`, `isGranted(id)` (signal), `acceptAll()` / `rejectAll()` / `save(decision)`, `reopen()`. |
| `runWhenConsented(id, fn)`      | Run a side effect once the category is consented (immediately if it already is).                                           |
| `ConsentIf`                     | `<div *consentIf="'marketing'">` — render a block only while consented.                                                    |
| `CookiePolicy`, `PrivacyPolicy` | Route components (`/legal/cookies`, `/legal/privacy`) — **templates**, fill the `[PLACEHOLDERS]`.                          |

## How it works

- **Nothing non-essential is granted before a decision.** The starter
  loads no analytics tag — `runWhenConsented` / `*consentIf` are the hooks
  where a project plugs one in.
- The banner is **non-blocking**: the page paints and stays usable behind
  it. "Reject all" and "Accept all" have equal visual weight.
- The decision is stored in `localStorage` (`app.consent`). It is
  re-requested when it **expires** (`expiresInDays`, default ~6 months) or
  when **`policyVersion`** changes. Storage blocked → the banner just
  reappears each visit.
- "Manage cookies" appears in the dashboard user-menu automatically (via
  the neutral `CONSENT_MANAGER` hook in `frontend-core` — no dependency
  from the dashboard on this brick).
- **Session cookie.** When the app wires the `SESSION_CONTROL` hook
  (`frontend-core`) and someone is signed in, the preferences dialog shows
  a "Session & authentication" toggle. Turning it off → a confirm dialog →
  `POST /auth/logout` (clears the refresh + CSRF cookies) → `/login`. The
  hook keeps this brick free of any dependency on `frontend-auth`.

## Configuring

```ts
provideConsent({
  policyVersion: '2026-06-01',
  categories: [
    {
      id: 'essential',
      label: 'Strictly necessary',
      description: '…',
      essential: true,
    },
    { id: 'analytics', label: 'Analytics', description: '…' },
    { id: 'marketing', label: 'Marketing', description: '…' },
  ],
});
```

Bump `policyVersion` whenever the cookie policy materially changes.

## i18n

Hard-coded English, like the other v2 bricks. Route the strings through a
translation pipe later.

## Running unit tests

`nx test frontend-consent`.
