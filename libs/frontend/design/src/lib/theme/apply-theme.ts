import {
  THEME_TOKEN_CSS_VAR,
  THEME_TOKEN_ON_CSS_VAR,
  THEME_TOKENS,
  ThemeMode,
  ThemeToken,
} from './theme.tokens';

const COLOR_SCHEME_BY_MODE: Record<ThemeMode, string> = {
  light: 'light',
  dark: 'dark',
  // `light-dark()` in _tokens.scss + `light dark` here => follows the OS.
  system: 'light dark',
};

// All DOM writes for the runtime theme go through this module, so the
// ThemeService stays a thin state holder and every mutation is unit-tested
// against a detached element.

export function applyMode(root: HTMLElement, mode: ThemeMode): void {
  root.style.setProperty('color-scheme', COLOR_SCHEME_BY_MODE[mode]);
}

export function applyColorOverride(
  root: HTMLElement,
  token: ThemeToken,
  hex: string,
): void {
  root.style.setProperty(THEME_TOKEN_CSS_VAR[token], hex);
  root.style.setProperty(THEME_TOKEN_ON_CSS_VAR[token], contrastColor(hex));
}

export function clearColorOverride(root: HTMLElement, token: ThemeToken): void {
  root.style.removeProperty(THEME_TOKEN_CSS_VAR[token]);
  root.style.removeProperty(THEME_TOKEN_ON_CSS_VAR[token]);
}

export function applyColorOverrides(
  root: HTMLElement,
  overrides: Partial<Record<ThemeToken, string>>,
): void {
  for (const token of THEME_TOKENS) {
    const hex = overrides[token];
    if (hex) {
      applyColorOverride(root, token, hex);
    } else {
      clearColorOverride(root, token);
    }
  }
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let body = hex.replace('#', '');
  if (body.length === 3) {
    body = body
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

/**
 * Black or white text for a given background, by WCAG relative luminance —
 * so a retinted `primary` still gets readable `on-primary`.
 */
export function contrastColor(hex: string): string {
  const { r, g, b } = parseHex(hex);
  const channel = (value: number): number => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.4 ? '#1a1a1e' : '#ffffff';
}
