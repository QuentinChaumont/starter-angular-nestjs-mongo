export {
  provideI18n,
  AVAILABLE_LANGS,
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  isAppLang,
  type AppLang,
} from './lib/provide-i18n';
// `<lib-lang-switcher>` (a MatMenu) is imported from its own entry point
// `@org/frontend-i18n/lang-switcher` by the shell — keeping it out of this
// barrel, which is imported eagerly for `provideI18n`.
export { provideTranslocoTesting } from './lib/testing';
export { en } from './lib/i18n/en';
export { fr } from './lib/i18n/fr';
export type { TranslationShape } from './lib/i18n/en';
