import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { API_BASE_URL } from '@org/frontend-core';
import { AuthStore } from '../auth.store';
import { OidcCallback } from './oidc-callback';

function configure(hash: string) {
  const navigateByUrl = jest.fn();
  const navigate = jest.fn();
  window.location.hash = hash;
  const replaceState = jest.spyOn(window.history, 'replaceState');

  TestBed.configureTestingModule({
    imports: [OidcCallback],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: '/api' },
      { provide: Router, useValue: { navigate, navigateByUrl } },
    ],
  });
  return { navigate, navigateByUrl, replaceState };
}

describe('OidcCallback', () => {
  afterEach(() => {
    window.location.hash = '';
    jest.restoreAllMocks();
  });

  it('consumes the token, scrubs the fragment, loads the profile and forwards', () => {
    const { navigateByUrl, replaceState } = configure(
      '#access_token=at-1&expires_in=900&token_type=Bearer&redirect_to=%2Fapp%2Fx',
    );

    const fixture = TestBed.createComponent(OidcCallback);
    fixture.detectChanges();

    expect(replaceState).toHaveBeenCalled();
    expect(TestBed.inject(AuthStore).token()).toBe('at-1');

    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({ id: 'u1', roles: [] });

    expect(navigateByUrl).toHaveBeenCalledWith('/app/x');
  });

  it('routes to /login when the fragment has no token', () => {
    const { navigate } = configure('#error=access_denied');
    TestBed.createComponent(OidcCallback);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
