import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@org/frontend-core';
import { csrfInterceptor } from './csrf.interceptor';

const BASE = '/api';

function setup(cookie: string) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([csrfInterceptor])),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: DOCUMENT, useValue: { cookie } },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    mock: TestBed.inject(HttpTestingController),
  };
}

describe('csrfInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('adds X-CSRF-Token to /auth/refresh from the cookie', () => {
    const { http, mock } = setup('csrf-token=tok-42; other=x');

    http.post(`${BASE}/auth/refresh`, {}).subscribe();

    const req = mock.expectOne(`${BASE}/auth/refresh`);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('tok-42');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('adds it to /auth/logout too', () => {
    const { http, mock } = setup('csrf-token=tok-42');
    http.post(`${BASE}/auth/logout`, {}).subscribe();
    const req = mock.expectOne(`${BASE}/auth/logout`);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('tok-42');
    req.flush({});
  });

  it('leaves other requests untouched', () => {
    const { http, mock } = setup('csrf-token=tok-42');
    http.get(`${BASE}/things`).subscribe();
    const req = mock.expectOne(`${BASE}/things`);
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush({});
  });

  it('skips the header when the cookie is absent', () => {
    const { http, mock } = setup('unrelated=1');
    http.post(`${BASE}/auth/refresh`, {}).subscribe();
    const req = mock.expectOne(`${BASE}/auth/refresh`);
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush({});
  });
});
