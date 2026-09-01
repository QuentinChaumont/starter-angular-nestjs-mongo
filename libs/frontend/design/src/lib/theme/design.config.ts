import { DesignConfig } from './theme.types';

/**
 * Default brand charter. **Replace these placeholder values with the
 * project's own palette** — this is a brand-neutral indigo/slate starting
 * point, not a design decision.
 *
 * When you change a colour here, mirror it in `_tokens.scss` (same file
 * folder): the SCSS is what the browser reads, this object is what the
 * runtime `ThemeService` (step 24) treats as "the default to reset to".
 * `DESIGN.md` at the repo root documents the whole system.
 */
export const designConfig: DesignConfig = {
  colors: {
    primary: '#4f46e5',
    onPrimary: '#ffffff',
    secondary: '#0891b2',
    onSecondary: '#ffffff',
    error: '#dc2626',
    onError: '#ffffff',
    background: '#f7f7f8',
    surface: '#ffffff',
    onSurface: '#1a1a1e',
    surfaceVariant: '#ececef',
    outline: '#c7c7cc',
  },
  darkColors: {
    primary: '#a5b4fc',
    onPrimary: '#1e1b4b',
    secondary: '#67e8f9',
    onSecondary: '#083344',
    error: '#f87171',
    onError: '#450a0a',
    background: '#131316',
    surface: '#1c1c20',
    onSurface: '#e8e8ea',
    surfaceVariant: '#2b2b30',
    outline: '#4a4a52',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    pill: '999px',
  },
  density: 0,
  typography: {
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
};
