import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE_URL } from '@org/frontend-core';
import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
  });

  it('posts the form and navigates on success', () => {
    const navigate = jest
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
    };
    cmp.form.setValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Str0ng!Passw0rd',
    });
    cmp.submit();

    const http = TestBed.inject(HttpTestingController);
    const req = http.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      accessToken: 'a.b.c',
      expiresIn: 900,
      tokenType: 'Bearer',
      user: { id: '1', roles: [] },
    });

    expect(navigate).toHaveBeenCalledWith('/');
    http.verify();
  });

  it('shows an error message when the email is taken', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      form: { setValue: (v: unknown) => void };
      submit: () => void;
    };
    cmp.form.setValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Str0ng!Passw0rd',
    });
    cmp.submit();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/register').flush(
      {
        statusCode: 409,
        code: 'USER_EMAIL_ALREADY_EXISTS',
        message: 'A user with this email already exists',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'already exists',
    );
    http.verify();
  });
});
