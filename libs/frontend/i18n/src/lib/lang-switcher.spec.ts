import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { API_BASE_URL } from '@org/frontend-core';
import { LangSwitcher } from './lang-switcher';
import { LANG_STORAGE_KEY } from './provide-i18n';
import { provideTranslocoTesting } from './testing';

function render() {
  TestBed.configureTestingModule({
    imports: [LangSwitcher],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslocoTesting(),
      { provide: API_BASE_URL, useValue: '/api' },
    ],
  });
  const fixture = TestBed.createComponent(LangSwitcher);
  fixture.detectChanges();
  return fixture;
}

describe('LangSwitcher', () => {
  afterEach(() => {
    try {
      globalThis.localStorage?.removeItem(LANG_STORAGE_KEY);
    } catch {
      /* noop */
    }
  });

  it('switches the active language, remembers it and persists to the account', () => {
    const fixture = render();
    fixture.componentInstance['choose']('fr');

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('fr');
    expect(globalThis.localStorage?.getItem(LANG_STORAGE_KEY)).toBe('fr');

    const req = TestBed.inject(HttpTestingController).expectOne('/api/users/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ locale: 'fr' });
    req.flush({});
  });

  it('ignores a no-op selection of the current language', () => {
    const fixture = render();
    fixture.componentInstance['choose']('en');

    TestBed.inject(HttpTestingController).expectNone('/api/users/me');
  });

  it('survives the account persistence call failing', () => {
    const fixture = render();
    fixture.componentInstance['choose']('fr');

    TestBed.inject(HttpTestingController)
      .expectOne('/api/users/me')
      .flush({ message: 'nope' }, { status: 500, statusText: 'Server Error' });

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('fr');
  });
});
