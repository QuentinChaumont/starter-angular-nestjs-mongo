export {
  provideI18n,
  AVAILABLE_LANGS,
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  isAppLang,
  type AppLang,
} from './lib/provide-i18n';
export { LangSwitcher } from './lib/lang-switcher';
export { provideTranslocoTesting } from './lib/testing';
export { en } from './lib/i18n/en';
export { fr } from './lib/i18n/fr';
export type { TranslationShape } from './lib/i18n/en';
