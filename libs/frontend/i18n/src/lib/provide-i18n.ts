import { DOCUMENT } from '@angular/common';
import {
  EnvironmentProviders,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import {
  Translation,
  TranslocoLoader,
  TranslocoService,
  provideTransloco,
} from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { en } from './i18n/en';
import { fr } from './i18n/fr';

export const AVAILABLE_LANGS = ['en', 'fr'] as const;
export type AppLang = (typeof AVAILABLE_LANGS)[number];
export const DEFAULT_LANG: AppLang = 'en';

/** Where the chosen language is remembered for a guest. */
export const LANG_STORAGE_KEY = 'app.lang';

export function isAppLang(value: unknown): value is AppLang {
  return (
    typeof value === 'string' && (AVAILABLE_LANGS as readonly string[]).includes(value)
  );
}

/** Bundled translations — no HTTP, so it works offline / under SSR. */
class InlineTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(lang === 'fr' ? fr : en);
  }
}

function detectLang(): AppLang {
  try {
    const stored = globalThis.localStorage?.getItem(LANG_STORAGE_KEY);
    if (isAppLang(stored)) {
      return stored;
    }
  } catch {
    /* storage unavailable */
  }
  const nav = (globalThis.navigator?.language ?? '').slice(0, 2).toLowerCase();
  return isAppLang(nav) ? nav : DEFAULT_LANG;
}

/**
 * i18n for the frontend (V2.3 step 47) — Transloco with `en` / `fr`
 * bundled. On startup the active language is `localStorage` → the
 * browser's language → `en`; once a user signs in, `frontend-auth` applies
 * their stored `locale` on top.
 */
export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: [...AVAILABLE_LANGS],
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: {
          logMissingKey: isDevMode(),
          useFallbackTranslation: true,
        },
      },
      loader: InlineTranslocoLoader,
    }),
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      const root = inject(DOCUMENT).documentElement;

      transloco.setActiveLang(detectLang());
      // Keep `<html lang>` in sync — screen readers, hyphenation, spell
      // check and `:lang()` selectors all read it.
      root.lang = transloco.getActiveLang();
      transloco.langChanges$.subscribe((lang) => {
        root.lang = lang;
      });
    }),
  ]);
}
