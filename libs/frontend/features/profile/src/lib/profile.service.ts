import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '@org/frontend-core';
import type {
  ChangePasswordRequest,
  ConnectedAccounts,
  DeleteAccountRequest,
  StartIdentityLinkResponse,
  TwoFactorConfirmResponse,
  TwoFactorSetupResponse,
  UpdateProfileRequest,
  UserProfile,
} from '@org/shared-contracts';
import { Observable } from 'rxjs';

/** HTTP calls for the profile brick (V2.1 step 34). Split from
 * `AuthService` so the base brick stays untouched when this isn't installed. */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/users/me`, {
      withCredentials: true,
    });
  }

  updateProfile(patch: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.base}/users/me`, patch, {
      withCredentials: true,
    });
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/change-password`, payload, {
      withCredentials: true,
    });
  }

  /** Permanent. The password is re-confirmed server-side. */
  deleteAccount(password: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/me`, {
      body: { password } satisfies DeleteAccountRequest,
      withCredentials: true,
    });
  }

  /* ---- connected accounts (V2.2 step 42) ---- */

  /** Login methods linked to the current account. */
  getConnectedAccounts(): Observable<ConnectedAccounts> {
    return this.http.get<ConnectedAccounts>(`${this.base}/auth/identities`, {
      withCredentials: true,
    });
  }

  /** Starts linking `provider` — the caller navigates to `authorizationUrl`. */
  startIdentityLink(provider: string): Observable<StartIdentityLinkResponse> {
    return this.http.post<StartIdentityLinkResponse>(
      `${this.base}/auth/identities/${provider}/link`,
      {},
      { withCredentials: true },
    );
  }

  /** Removes a linked provider. `409` if it's the last way to sign in. */
  unlinkIdentity(provider: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/auth/identities/${provider}`,
      { withCredentials: true },
    );
  }

  /* ---- two-factor authentication (V2.2 step 43) ---- */

  /** Begin TOTP enrollment — nothing is active until `confirmTwoFactor`. */
  setupTwoFactor(): Observable<TwoFactorSetupResponse> {
    return this.http.post<TwoFactorSetupResponse>(
      `${this.base}/auth/2fa/setup`,
      {},
      { withCredentials: true },
    );
  }

  /** Verify the first code; returns the one-time backup codes. */
  confirmTwoFactor(code: string): Observable<TwoFactorConfirmResponse> {
    return this.http.post<TwoFactorConfirmResponse>(
      `${this.base}/auth/2fa/confirm`,
      { code },
      { withCredentials: true },
    );
  }

  disableTwoFactor(password: string): Observable<void> {
    return this.http.post<void>(
      `${this.base}/auth/2fa/disable`,
      { password },
      { withCredentials: true },
    );
  }
}
