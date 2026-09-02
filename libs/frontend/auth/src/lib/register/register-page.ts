import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isApiError } from '@org/shared-contracts';
import { AuthService } from '../auth.service';
import { sanitizeRedirect } from '../sanitize-redirect';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'lib-register-page',
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
    <section class="register">
      @if (submitting()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <h1>Create your account</h1>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="register__row">
          <mat-form-field appearance="outline">
            <mat-label>First name</mat-label>
            <input matInput formControlName="firstName" autocomplete="given-name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Last name</mat-label>
            <input matInput formControlName="lastName" autocomplete="family-name" />
          </mat-form-field>
        </div>

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
            autocomplete="new-password"
          />
          <mat-hint>At least {{ minPasswordLength }} characters</mat-hint>
        </mat-form-field>

        @if (error()) {
          <p class="register__error" role="alert">{{ error() }}</p>
        }

        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitting()"
        >
          Create account
        </button>
      </form>

      <a routerLink="/login">Already have an account? Sign in</a>
    </section>
  `,
  styles: `
    .register {
      max-width: 420px;
      margin: 8vh auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
    }
    .register form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .register__row {
      display: flex;
      gap: 8px;
    }
    .register__row mat-form-field {
      flex: 1;
    }
    .register__error {
      color: var(--app-color-error);
      margin: 0;
    }
  `,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly redirectTo = sanitizeRedirect(
    this.route.snapshot.queryParamMap.get('redirectTo'),
  );

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl(this.redirectTo),
      error: (err: unknown) => {
        this.submitting.set(false);
        const body = err instanceof HttpErrorResponse ? err.error : null;
        this.error.set(
          isApiError(body) ? body.message : 'Could not create the account',
        );
      },
    });
  }
}
