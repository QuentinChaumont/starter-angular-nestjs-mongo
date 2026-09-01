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

  it('renders the sign-in form and hides the SSO button when OIDC is disabled', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/oidc/provider').flush({ enabled: false, loginUrl: '' });
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('input[type="email"]')).not.toBeNull();
    expect(html.querySelector('input[type="password"]')).not.toBeNull();
    expect(html.textContent).not.toContain('SSO');
    http.verify();
  });

  it('shows the SSO button when the provider is enabled', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/auth/oidc/provider')
      .flush({ enabled: true, loginUrl: '/api/auth/oidc/login' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('SSO');
    http.verify();
  });
});
