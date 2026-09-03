import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@org/frontend-core';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const BASE = '/api';
const USER = { id: 'u1', roles: ['admin'] };
const TOKENS = { accessToken: 'a1', expiresIn: 900, tokenType: 'Bearer' as const };

describe('AuthService', () => {
  let service: AuthService;
  let store: AuthStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    service = TestBed.inject(AuthService);
    store = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login stores the session and returns the authenticated user', () => {
    let received: unknown;
    service.login({ email: 'a@b.com', password: 'pw' }).subscribe((o) => {
      received = o;
    });

    const req = http.expectOne(`${BASE}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ...TOKENS, user: USER });

    expect(received).toEqual({ kind: 'authenticated', user: USER });
    expect(store.token()).toBe('a1');
    expect(store.isAuthenticated()).toBe(true);
  });

  it('login surfaces a 2FA challenge without opening a session', () => {
    let received: unknown;
    service.login({ email: 'a@b.com', password: 'pw' }).subscribe((o) => {
      received = o;
    });

    http
      .expectOne(`${BASE}/auth/login`)
      .flush({ twoFactorRequired: true, pendingToken: 'pt-1', expiresIn: 300 });

    expect(received).toEqual({ kind: 'two-factor', pendingToken: 'pt-1' });
    expect(store.isAuthenticated()).toBe(false);
  });

  it('verifyTwoFactor exchanges the code for a session', () => {
    let received: unknown;
    service.verifyTwoFactor('pt-1', '123456').subscribe((u) => {
      received = u;
    });

    const req = http.expectOne(`${BASE}/auth/2fa/verify`);
    expect(req.request.body).toEqual({ pendingToken: 'pt-1', code: '123456' });
    req.flush({ ...TOKENS, user: USER });

    expect(received).toEqual(USER);
    expect(store.token()).toBe('a1');
    expect(store.isAuthenticated()).toBe(true);
  });

  it('login failure resets the store and surfaces the error', () => {
    const errors: unknown[] = [];
    service
      .login({ email: 'a@b.com', password: 'bad' })
      .subscribe({ error: (e) => errors.push(e) });

    http.expectOne(`${BASE}/auth/login`).flush(
      { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'nope' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(errors).toHaveLength(1);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('concurrent refresh() calls share a single request', () => {
    service.refresh().subscribe();
    service.refresh().subscribe();

    const req = http.expectOne(`${BASE}/auth/refresh`);
    req.flush(TOKENS);
    expect(store.token()).toBe('a1');

    // a later refresh starts a fresh request
    service.refresh().subscribe();
    http.expectOne(`${BASE}/auth/refresh`).flush(TOKENS);
  });

  it('silentRefresh resolves true after refresh + loadMe, false on failure', () => {
    const results: boolean[] = [];
    service.silentRefresh().subscribe((ok) => results.push(ok));

    http.expectOne(`${BASE}/auth/refresh`).flush(TOKENS);
    http.expectOne(`${BASE}/auth/me`).flush(USER);
    expect(results).toEqual([true]);
    expect(store.user()).toEqual(USER);

    service.silentRefresh().subscribe((ok) => results.push(ok));
    http
      .expectOne(`${BASE}/auth/refresh`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(results).toEqual([true, false]);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('logout resets the store even when the request fails', () => {
    store.setSession('a1', USER);

    service.logout().subscribe();
    http
      .expectOne(`${BASE}/auth/logout`)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.isAuthenticated()).toBe(false);
  });

  it('oidcProviders falls back to an empty list on error', () => {
    let list: unknown;
    service.oidcProviders().subscribe((l) => (list = l));
    http
      .expectOne(`${BASE}/auth/oidc/providers`)
      .flush(null, { status: 500, statusText: 'x' });
    expect(list).toEqual([]);
  });

  it('oidcLoginUrl prepends the API base and encodes redirectTo', () => {
    const provider = {
      id: 'generic',
      label: 'SSO',
      loginUrl: '/auth/oidc/generic/login',
    };
    expect(service.oidcLoginUrl(provider, '/app/x')).toBe(
      `${BASE}/auth/oidc/generic/login?redirectTo=%2Fapp%2Fx`,
    );
    expect(service.oidcLoginUrl(provider)).toBe(
      `${BASE}/auth/oidc/generic/login`,
    );
  });
});
