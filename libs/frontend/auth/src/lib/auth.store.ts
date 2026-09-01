import { Injectable, computed, signal } from '@angular/core';
import { AuthenticatedUserDto } from '@org/shared-contracts';

export type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated';

/**
 * Client-side auth state. The **access token lives only in memory** — never
 * `localStorage` — so a tab close ends it; a reload restores the session
 * through a silent refresh (the refresh token is an httpOnly cookie the JS
 * never sees).
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<AuthenticatedUserDto | null>(null);
  private readonly _status = signal<AuthStatus>('anonymous');
  private readonly _accessToken = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly status = this._status.asReadonly();
  readonly token = this._accessToken.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  markAuthenticating(): void {
    this._status.set('authenticating');
  }

  setAccessToken(token: string): void {
    this._accessToken.set(token);
  }

  setSession(token: string, user: AuthenticatedUserDto): void {
    this._accessToken.set(token);
    this._user.set(user);
    this._status.set('authenticated');
  }

  setUser(user: AuthenticatedUserDto): void {
    this._user.set(user);
    this._status.set('authenticated');
  }

  reset(): void {
    this._accessToken.set(null);
    this._user.set(null);
    this._status.set('anonymous');
  }
}
