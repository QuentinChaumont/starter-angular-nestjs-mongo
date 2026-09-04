export { materialProviders } from './lib/material/material.providers';
export { designConfig } from './lib/theme/design.config';
export { provideTheme } from './lib/theme/provide-theme';
export { ThemeService } from './lib/theme/theme.service';
// `ThemeSettingsPanel` (a dialog with MatButtonToggle) is reached only via
// its own lazy entry point `@org/frontend-design/theme-panel` — not this
// barrel, which is imported eagerly for `materialProviders` / `provideTheme`.
export {
  THEME_MODES,
  THEME_TOKENS,
  THEME_TOKEN_LABEL,
  isValidHexColor,
} from './lib/theme/theme.tokens';
export type { ThemeMode, ThemeToken } from './lib/theme/theme.tokens';
export type {
  BrandColorToken,
  DesignColors,
  DesignConfig,
} from './lib/theme/theme.types';
