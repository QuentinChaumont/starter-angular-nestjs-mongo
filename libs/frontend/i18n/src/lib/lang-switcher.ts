import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { API_BASE_URL } from '@org/frontend-core';
import { catchError, of } from 'rxjs';
import {
  AVAILABLE_LANGS,
  AppLang,
  LANG_STORAGE_KEY,
  isAppLang,
} from './provide-i18n';

/**
 * Language picker for the dashboard toolbar (V2.3 step 47). Changes the
 * active language, remembers it in `localStorage`, and — best-effort —
 * persists it to the signed-in account (`PATCH /users/me`). Renders
 * nothing when only one language is configured.
 */
@Component({
  selector: 'lib-lang-switcher',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (langs.length > 1) {
      <button
        mat-icon-button
        [matMenuTriggerFor]="menu"
        [attr.aria-label]="'lang.label' | transloco"
      >
        <mat-icon>translate</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        @for (lang of langs; track lang) {
          <button
            mat-menu-item
            [disabled]="lang === active()"
            (click)="choose(lang)"
          >
            {{ 'lang.' + lang | transloco }}
          </button>
        }
      </mat-menu>
    }
  `,
})
export class LangSwitcher {
  private readonly transloco = inject(TranslocoService);
  private readonly http = inject(HttpClient);
  private readonly apiBase = inject(API_BASE_URL);

  protected readonly langs = [...AVAILABLE_LANGS];
  protected readonly active = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang() as AppLang,
  });

  protected choose(lang: AppLang): void {
    if (!isAppLang(lang) || lang === this.active()) {
      return;
    }
    this.transloco.setActiveLang(lang);
    try {
      globalThis.localStorage?.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* storage unavailable */
    }
    this.http
      .patch(
        `${this.apiBase}/users/me`,
        { locale: lang },
        { withCredentials: true },
      )
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}
