import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { API_BASE_URL, ME_ENDPOINT } from '@org/frontend-core';
import {
  AccessTokenResponse,
  AuthenticatedUserDto,
  LoginRequest,
  OidcProviderInfo,
  RegisterRequest,
  RegistrationInfo,
  TwoFactorChallenge,
} from '@org/shared-contracts';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthStore } from './auth.store';

interface LoginResponse extends AccessTokenResponse {
  user: AuthenticatedUserDto;
}

/**
 * Outcome of {@link AuthService.login}: either a live session, or a TOTP
 * challenge (V2.2 step 43) — the caller must collect a code and call
 * {@link AuthService.verifyTwoFactor} with `pendingToken`.
 */
export type LoginOutcome =
  | { kind: 'authenticated'; user: AuthenticatedUserDto }
  | { kind: 'two-factor'; pendingToken: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly meEndpoint = inject(ME_ENDPOINT);
  private readonly store = inject(AuthStore);
  /** Optional: only present when the `frontend-i18n` brick is installed. */
  private readonly transloco = inject(TranslocoService, { optional: true });

  /** Single in-flight refresh shared by every concurrent 401. */
  private refresh$: Observable<AccessTokenResponse> | null = null;

  login(credentials: LoginRequest): Observable<LoginOutcome> {
    this.store.markAuthenticating();
    return this.http
      .post<LoginResponse | TwoFactorChallenge>(
        `${this.base}/auth/login`,
        credentials,
        { withCredentials: true },
      )
      .pipe(
        map((res): LoginOutcome => {
          if ('twoFactorRequired' in res) {
            // Not signed in yet — wait for the code.
            this.store.reset();
            return { kind: 'two-factor', pendingToken: res.pendingToken };
          }
          this.store.setSession(res.accessToken, res.user);
          return { kind: 'authenticated', user: res.user };
        }),
        catchError((err) => {
          this.store.reset();
          return throwError(() => err);
        }),
      );
  }

  /** Second leg of a 2FA login: exchange the pending token + code for a session. */
  verifyTwoFactor(
    pendingToken: string,
    code: string,
  ): Observable<AuthenticatedUserDto> {
    this.store.markAuthenticating();
    return this.http
      .post<LoginResponse>(
        `${this.base}/auth/2fa/verify`,
        { pendingToken, code },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => this.store.setSession(res.accessToken, res.user)),
        map((res) => res.user),
        catchError((err) => {
          this.store.reset();
          return throwError(() => err);
        }),
      );
  }

  register(payload: RegisterRequest): Observable<AuthenticatedUserDto> {
    this.store.markAuthenticating();
    return this.http
      .post<LoginResponse>(`${this.base}/auth/register`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => this.store.setSession(res.accessToken, res.user)),
        map((res) => res.user),
        catchError((err) => {
          this.store.reset();
          return throwError(() => err);
        }),
      );
  }

  /** Whether self-service registration is offered (drives the login link). */
  registrationEnabled(): Observable<boolean> {
    return this.http
      .get<RegistrationInfo>(`${this.base}/auth/registration`)
      .pipe(
        map((info) => info.enabled),
        catchError(() => of(false)),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        tap(() => this.store.reset()),
        map(() => undefined),
      );
  }

  refresh(): Observable<AccessTokenResponse> {
    if (!this.refresh$) {
      this.refresh$ = this.http
        .post<AccessTokenResponse>(
          `${this.base}/auth/refresh`,
          {},
          { withCredentials: true },
        )
        .pipe(
          tap((res) => this.store.setAccessToken(res.accessToken)),
          catchError((err) => {
            this.store.reset();
            return throwError(() => err);
          }),
          finalize(() => {
            this.refresh$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
    }
    return this.refresh$;
  }

  loadMe(): Observable<AuthenticatedUserDto> {
    return this.http
      .get<AuthenticatedUserDto>(`${this.base}${this.meEndpoint}`, {
        withCredentials: true,
      })
      .pipe(
        tap((user) => {
          this.store.setUser(user);
          this.applyLocale(user.locale);
        }),
      );
  }

  /** Switch the UI to the account's saved language, if the i18n brick is
   * installed and the value is one it knows. */
  private applyLocale(locale: string | null | undefined): void {
    if (!this.transloco || !locale) {
      return;
    }
    const known = this.transloco
      .getAvailableLangs()
      .map((l) => (typeof l === 'string' ? l : l.id));
    if (known.includes(locale)) {
      this.transloco.setActiveLang(locale);
    }
  }

  /** refresh + loadMe; resolves to whether a session could be restored. */
  silentRefresh(): Observable<boolean> {
    return this.refresh().pipe(
      switchMap(() => this.loadMe()),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /** Active OIDC providers — one login button each (empty when none). */
  oidcProviders(): Observable<OidcProviderInfo[]> {
    return this.http
      .get<OidcProviderInfo[]>(`${this.base}/auth/oidc/providers`)
      .pipe(catchError(() => of([] as OidcProviderInfo[])));
  }

  oidcLoginUrl(provider: OidcProviderInfo, redirectTo?: string): string {
    const url = `${this.base}${provider.loginUrl}`;
    return redirectTo
      ? `${url}?redirectTo=${encodeURIComponent(redirectTo)}`
      : url;
  }
}
