export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

/**
 * The brand colours a project is expected to let end-users retint at
 * runtime (step 24's settings panel). Everything else stays fixed by the
 * charter. Each token maps to its `--app-color-*` CSS custom property plus
 * a derived `on-*` (text/icon) counterpart.
 */
export type ThemeToken = 'primary' | 'secondary' | 'surface';

export const THEME_TOKENS: readonly ThemeToken[] = [
  'primary',
  'secondary',
  'surface',
];

export const THEME_TOKEN_CSS_VAR: Record<ThemeToken, string> = {
  primary: '--app-color-primary',
  secondary: '--app-color-secondary',
  surface: '--app-color-surface',
};

export const THEME_TOKEN_ON_CSS_VAR: Record<ThemeToken, string> = {
  primary: '--app-color-on-primary',
  secondary: '--app-color-on-secondary',
  surface: '--app-color-on-surface',
};

export const THEME_TOKEN_LABEL: Record<ThemeToken, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  surface: 'Surface',
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value.trim());
}

/** Lower-cased, trimmed. Assumes {@link isValidHexColor} already passed. */
export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

export function isThemeToken(value: string): value is ThemeToken {
  return (THEME_TOKENS as readonly string[]).includes(value);
}
