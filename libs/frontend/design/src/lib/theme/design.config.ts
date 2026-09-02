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
    primary: '#4b57d4',
    onPrimary: '#ffffff',
    secondary: '#0e7490',
    onSecondary: '#ffffff',
    error: '#c22b1f',
    onError: '#ffffff',
    background: '#f4f5f7',
    surface: '#ffffff',
    onSurface: '#1b1d21',
    surfaceVariant: '#eef0f3',
    outline: '#d6d9de',
  },
  darkColors: {
    primary: '#97a4ff',
    onPrimary: '#10132e',
    secondary: '#67e8f9',
    onSecondary: '#062c38',
    error: '#f4776a',
    onError: '#3a0906',
    background: '#0f1012',
    surface: '#17181b',
    onSurface: '#e4e6e9',
    surfaceVariant: '#212327',
    outline: '#2d3036',
  },
  radius: {
    sm: '3px',
    md: '5px',
    lg: '8px',
    pill: '999px',
  },
  density: 0,
  typography: {
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
};
