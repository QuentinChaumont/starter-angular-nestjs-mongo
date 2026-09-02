import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isApiError } from '@org/shared-contracts';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AuthService } from '../auth.service';
import { sanitizeRedirect } from '../sanitize-redirect';

@Component({
  selector: 'lib-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="login">
      @if (submitting()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <h1>Sign in</h1>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="username" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input
            matInput
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
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

      @if (oidcEnabled()) {
        <a mat-stroked-button [href]="oidcUrl()">Sign in with SSO</a>
      }

      @if (registrationEnabled()) {
        <a routerLink="/register" [queryParams]="{ redirectTo: redirectTo }">
          Create an account
        </a>
      }
    </section>
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

  protected readonly redirectTo = sanitizeRedirect(
    this.route.snapshot.queryParamMap.get('redirectTo'),
  );

  protected readonly oidcEnabled = toSignal(
    this.auth.oidcProvider().pipe(map((info) => info.enabled)),
    { initialValue: false },
  );

  protected readonly registrationEnabled = toSignal(
    this.auth.registrationEnabled(),
    { initialValue: false },
  );

  protected oidcUrl(): string {
    return this.auth.oidcLoginUrl(this.redirectTo);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl(this.redirectTo),
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
