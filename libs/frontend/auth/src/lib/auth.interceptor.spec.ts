import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { API_BASE_URL } from '@org/frontend-core';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

const BASE = '/api';

describe('authInterceptor', () => {
  let http: HttpClient;
  let mock: HttpTestingController;
  let store: AuthStore;
  const navigate = jest.fn();

  beforeEach(() => {
    navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
        { provide: Router, useValue: { navigate } },
      ],
    });
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => mock.verify());

  it('adds Authorization + X-Request-Id to a normal request', () => {
    store.setSession('token-1', { id: 'u1', roles: [] });

    http.get(`${BASE}/things`).subscribe();

    const req = mock.expectOne(`${BASE}/things`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(req.request.headers.get('X-Request-Id')).toBeTruthy();
    req.flush({});
  });

  it('on 401 refreshes once then replays the request with the new token', () => {
    store.setSession('stale', { id: 'u1', roles: [] });
    let body: unknown;
    http.get(`${BASE}/things`).subscribe((r) => (body = r));

    mock
      .expectOne(`${BASE}/things`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    mock.expectOne(`${BASE}/auth/refresh`).flush({
      accessToken: 'fresh',
      expiresIn: 900,
      tokenType: 'Bearer',
    });

    const replay = mock.expectOne(`${BASE}/things`);
    expect(replay.request.headers.get('Authorization')).toBe('Bearer fresh');
    replay.flush({ ok: true });

    expect(body).toEqual({ ok: true });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('routes to /login and resets the store when the refresh fails', () => {
    store.setSession('stale', { id: 'u1', roles: [] });
    const errors: unknown[] = [];
    http.get(`${BASE}/things`).subscribe({ error: (e) => errors.push(e) });

    mock
      .expectOne(`${BASE}/things`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    mock
      .expectOne(`${BASE}/auth/refresh`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(errors).toHaveLength(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('does not attempt a refresh for auth endpoints', () => {
    const errors: unknown[] = [];
    http
      .post(`${BASE}/auth/login`, {})
      .subscribe({ error: (e) => errors.push(e) });

    mock
      .expectOne(`${BASE}/auth/login`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    mock.expectNone(`${BASE}/auth/refresh`);
    expect(errors).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});
