import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PasswordRevealButton } from '@org/frontend-ui';
import { isApiError, OidcProviderInfo } from '@org/shared-contracts';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth.service';
import { sanitizeRedirect } from '../sanitize-redirect';
import { TwoFactorPrompt } from '../two-factor/two-factor-prompt';

@Component({
  selector: 'lib-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    PasswordRevealButton,
    TwoFactorPrompt,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pendingToken(); as token) {
      <lib-two-factor-prompt [pendingToken]="token" [redirectTo]="redirectTo" />
    } @else {
    <section class="login">
      @if (submitting()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <h1>Sign in</h1>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            autocomplete="username"
          />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input
            #password
            matInput
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
          <lib-password-reveal-button matSuffix [input]="password" />
        </mat-form-field>

        @if (error()) {
          <p class="login__error" role="alert">{{ error() }}</p>
        }

        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitting()"
        >
          Sign in
        </button>
      </form>
      <a routerLink="/forgot-password">Forgot your password?</a>

      @for (provider of oidcProviders(); track provider.id) {
        <a
          mat-stroked-button
          class="login__provider"
          [href]="oidcUrl(provider)"
        >
          @if (provider.id === 'google') {
            <!-- Official Google "G" — must not be recoloured (branding guidelines). -->
            <svg
              class="login__provider-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
          }
          Sign in with {{ provider.label }}
        </a>
      }

      @if (registrationEnabled()) {
        <a routerLink="/register" [queryParams]="{ redirectTo: redirectTo }">
          Create an account
        </a>
      }
    </section>
    }
  `,
  styles: `
    .login {
      max-width: 360px;
      margin: 8vh auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
    }
    .login form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .login__error {
      color: var(--app-color-error);
      margin: 0;
    }
    .login__provider {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .login__provider-icon {
      width: 18px;
      height: 18px;
    }
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Set once a password login comes back with a 2FA challenge. */
  protected readonly pendingToken = signal<string | null>(null);

  protected readonly redirectTo = sanitizeRedirect(
    this.route.snapshot.queryParamMap.get('redirectTo'),
  );

  protected readonly oidcProviders = toSignal(this.auth.oidcProviders(), {
    initialValue: [] as OidcProviderInfo[],
  });

  protected readonly registrationEnabled = toSignal(
    this.auth.registrationEnabled(),
    { initialValue: false },
  );

  protected oidcUrl(provider: OidcProviderInfo): string {
    return this.auth.oidcLoginUrl(provider, this.redirectTo);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (outcome) => {
        if (outcome.kind === 'two-factor') {
          this.submitting.set(false);
          this.pendingToken.set(outcome.pendingToken);
          return;
        }
        this.router.navigateByUrl(this.redirectTo);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const body = err instanceof HttpErrorResponse ? err.error : null;
        this.error.set(
          isApiError(body) ? body.message : 'Invalid email or password',
        );
      },
    });
  }
}
