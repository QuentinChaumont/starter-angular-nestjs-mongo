/**
 * The brand charter, in code. It is the **build-time** source of truth:
 * the values here must match `_tokens.scss` (which the browser actually
 * reads). Step 24's `ThemeService` reads this to know the defaults it can
 * reset back to, and to seed the runtime settings panel.
 */
export interface DesignColors {
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  error: string;
  onError: string;
  background: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  outline: string;
}

/** The tokens a project is expected to tweak per brand. */
export type BrandColorToken = 'primary' | 'secondary' | 'surface';

export interface DesignConfig {
  /** Light-mode palette. */
  colors: DesignColors;
  /** Dark-mode palette (same keys). */
  darkColors: DesignColors;
  radius: {
    sm: string;
    md: string;
    lg: string;
    pill: string;
  };
  /** Angular Material density (`0` comfortable … `-5` compact). */
  density: 0 | -1 | -2 | -3 | -4 | -5;
  typography: {
    fontFamily: string;
  };
}
