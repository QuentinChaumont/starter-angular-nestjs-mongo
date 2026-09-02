import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@org/shared-contracts';
import { Observable } from 'rxjs';

/**
 * HTTP calls for the `auth-reset` brick. Split from `AuthService` so the
 * base brick stays untouched when this one isn't installed.
 */
@Injectable({ providedIn: 'root' })
export class ResetService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/forgot-password`, {
      email,
    } satisfies ForgotPasswordRequest);
  }

  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/reset-password`, {
      token,
      password,
    } satisfies ResetPasswordRequest);
  }

  verifyEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/verify-email`, {
      token,
    } satisfies VerifyEmailRequest);
  }

  resendVerification(): Observable<void> {
    return this.http.post<void>(
      `${this.base}/auth/resend-verification`,
      {},
      { withCredentials: true },
    );
  }
}
