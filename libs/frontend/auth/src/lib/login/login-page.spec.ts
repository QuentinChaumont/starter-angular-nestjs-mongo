import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '@org/frontend-core';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
  });

  it('renders the sign-in form and no SSO button when no OIDC provider is active', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/oidc/providers').flush([]);
    http.expectOne('/api/auth/registration').flush({ enabled: false });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('input[type="email"]')).not.toBeNull();
    expect(html.querySelector('input[type="password"]')).not.toBeNull();
    expect(html.textContent).not.toContain('Sign in with');
    http.verify();
  });

  it('shows one button per active OIDC provider', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/oidc/providers').flush([
      { id: 'generic', label: 'SSO', loginUrl: '/auth/oidc/generic/login' },
      { id: 'google', label: 'Google', loginUrl: '/auth/oidc/google/login' },
    ]);
    http.expectOne('/api/auth/registration').flush({ enabled: false });
    fixture.detectChanges();

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('a[href*="oidc"]'),
    );
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Sign in with SSO',
      'Sign in with Google',
    ]);
    expect(links[0].getAttribute('href')).toContain(
      '/api/auth/oidc/generic/login',
    );
    // The Google button carries the branded logo; the generic one does not.
    expect(links[0].querySelector('svg')).toBeNull();
    expect(links[1].querySelector('svg')).not.toBeNull();
    http.verify();
  });

  it('swaps to the code prompt when login returns a 2FA challenge', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/oidc/providers').flush([]);
    http.expectOne('/api/auth/registration').flush({ enabled: false });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const fill = (selector: string, value: string): void => {
      const input = html.querySelector(selector) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    fill('input[type="email"]', 'a@b.com');
    fill('input[type="password"]', 'pw');
    fixture.detectChanges();

    (html.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );

    http.expectOne('/api/auth/login').flush({
      twoFactorRequired: true,
      pendingToken: 'pt-1',
      expiresIn: 300,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Two-factor authentication',
    );
    http.verify();
  });

  it('shows the "create an account" link when registration is enabled', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/oidc/providers').flush([]);
    http.expectOne('/api/auth/registration').flush({ enabled: true });
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href^="/register"]',
    );
    expect(link).not.toBeNull();
    http.verify();
  });
});
