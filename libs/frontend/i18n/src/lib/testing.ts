import { Provider } from '@angular/core';
import {
  TranslocoTestingModule,
  TranslocoTestingOptions,
} from '@jsverse/transloco';
import { en } from './i18n/en';
import { fr } from './i18n/fr';
import { AVAILABLE_LANGS, DEFAULT_LANG } from './provide-i18n';

/**
 * Drop into a component spec's `providers` so `| transloco` resolves
 * against the real bundled translations.
 *
 *   TestBed.configureTestingModule({
 *     imports: [MyComponent],
 *     providers: [provideTranslocoTesting()],
 *   });
 */
export function provideTranslocoTesting(
  options: TranslocoTestingOptions = {},
): Provider[] {
  return [
    TranslocoTestingModule.forRoot({
      langs: { en, fr },
      translocoConfig: {
        availableLangs: [...AVAILABLE_LANGS],
        defaultLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
      },
      preloadLangs: true,
      ...options,
    }).providers ?? [],
  ];
}
