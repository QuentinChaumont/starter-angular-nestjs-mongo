# frontend-design

The visual foundation: Angular Material + CDK, the M3 theme, and the brand
charter. Install with `nx g @org/starter-plugin:frontend-design`.

## What it exposes (`@org/frontend-design`)

| Export | Use |
| --- | --- |
| `materialProviders` | Spread into `app.config.ts` — animations (lazy), `MatFormField` `outline` default, `MatSnackBar` 4s default. |
| `provideTheme()` | Also spread into `app.config.ts` — applies the persisted runtime theme before first paint. |
| `ThemeService` | Signals `mode()` / `overrides()`; `setMode()`, `setColor()`, `resetColor()`, `resetAll()`. |
| `ThemeSettingsPanel` | `<lib-theme-settings-panel>` — standalone panel (mode toggle + colour pickers + reset). |
| `designConfig` | The brand charter as a typed object — the build-time source of truth. |
| `THEME_MODES`, `THEME_TOKENS`, `THEME_TOKEN_LABEL`, `isValidHexColor` | Runtime-theming helpers. |
| `ThemeMode`, `ThemeToken`, `DesignConfig`, `DesignColors`, `BrandColorToken` | Types. |

SCSS entry point (imported once from `apps/frontend/src/styles.scss`):

```scss
@use '../../../libs/frontend/design/src/lib/theme/theme';
```

## Theming model

- **`theme/_tokens.scss`** — every brand value as a CSS custom property
  (`--app-color-primary`, `--app-radius-md`, `--app-font-family`, …), each
  colour written `light-dark(<light>, <dark>)`. This is what the browser
  reads.
- **`theme/design.config.ts`** — the same values in TypeScript. Edit both
  together. Step 24's `ThemeService` treats this as "the defaults".
- **`theme/_theme.scss`** — sets up `mat.theme()` (typography, density,
  shape, the tonal system Material needs) then re-points the key
  `--mat-sys-*` colour tokens at the `--app-color-*` tokens, so Material
  components follow the charter and any runtime override.
- Light / dark is a single `color-scheme` switch on `<html>` (system by
  default; forced by the ThemeService).

## Changing the palette

- **Build-time (permanent):** edit `design.config.ts` **and** the matching
  values in `_tokens.scss`.
- **Runtime (per visitor):** `ThemeService` / `<lib-theme-settings-panel>`.
  It sets `color-scheme` on `<html>` and writes `--app-color-*` overrides
  as inline styles, persisted in `localStorage`
  (`app.theme.mode`, `app.theme.overrides`). It never touches the committed
  charter, and falls back silently if storage is unavailable. Overriding a
  colour also derives its `on-*` (contrast) counterpart, and pins that
  token to a single value (it no longer follows light/dark).

See `DESIGN.md` at the repo root for the full charter documentation.

## Icons

`mat-icon` is used in ligature mode with **Material Symbols Outlined**. The
starter does not bundle the font — add it per project (self-hosted, or a
`<link>` to Google Fonts in `apps/frontend/src/index.html`):

```html
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" />
```

## `libs/frontend/core` must not depend on Material

Anything touching `@angular/material` lives here or above, never in
`frontend-core`.

## Running unit tests

`nx test frontend-design`.
