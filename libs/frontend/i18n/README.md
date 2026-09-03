# frontend-i18n

Internationalisation for the Angular app (V2.3 step 47):
[Transloco](https://jsverse.github.io/transloco/) with **English and French
bundled** — no HTTP loader, since the starter has few strings and it keeps
things working offline / under SSR. Install with
`nx g @org/starter-plugin:frontend-i18n` (needs `frontend-design`).

## Exposes (`@org/frontend-i18n`)

| Export | Use |
| --- | --- |
| `provideI18n()` | Spread into `app.config.ts` — configures Transloco and sets the active language before the first render. |
| `LangSwitcher` (`<lib-lang-switcher>`) | Toolbar menu that changes the language; the dashboard shell already renders it. |
| `provideTranslocoTesting()` | Drop into a component spec's `providers` so `| transloco` resolves against the real bundled strings. |
| `AVAILABLE_LANGS`, `DEFAULT_LANG`, `LANG_STORAGE_KEY`, `isAppLang()`, `AppLang` | The language set and helpers. |
| `en`, `fr`, `TranslationShape` | The translation objects and their shared type. |

## Language resolution

1. `localStorage['app.lang']` (set by `<lib-lang-switcher>`)
2. `navigator.language` prefix (`fr-FR` → `fr`)
3. `DEFAULT_LANG` (`en`)

Once a user signs in, `frontend-auth`'s `AuthService.loadMe()` applies
their stored `locale` on top. `<lib-lang-switcher>` also persists the
choice with `PATCH /users/me { locale }` (best-effort — a failure is
swallowed).

## Adding strings

Edit `src/lib/i18n/en.ts` (the source of truth — `TranslationShape` is
`typeof en`) then `src/lib/i18n/fr.ts` (the compiler enforces the same
shape). Keys are namespaced by brick (`auth.login.title`, …). Each brick
ships its own `| transloco` keys with an English fallback, so a missing
translation degrades to English rather than a blank.

## Running unit tests

`nx test frontend-i18n`.
