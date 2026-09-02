import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isApiError } from '@org/shared-contracts';
import { ResetService } from './reset.service';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'lib-reset-password-page',
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
    <section class="reset">
      @if (submitting()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <h1>Choose a new password</h1>

      @if (!token) {
        <p class="reset__error" role="alert">
          This reset link is missing its token. Request a new one.
        </p>
        <a routerLink="/forgot-password">Request a new link</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>New password</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
            <mat-hint>At least {{ minPasswordLength }} characters</mat-hint>
          </mat-form-field>

          @if (error()) {
            <p class="reset__error" role="alert">{{ error() }}</p>
          }

          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || submitting()"
          >
            Reset password
          </button>
        </form>
      }
    </section>
  `,
  styles: `
    .reset {
      max-width: 360px;
      margin: 8vh auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
    }
    .reset form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .reset__error {
      color: var(--app-color-error);
      margin: 0;
    }
  `,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly reset = inject(ResetService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  protected readonly token = this.route.snapshot.queryParamMap.get('token');

  protected readonly form = this.fb.nonNullable.group({
    password: [
      '',
      [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)],
    ],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid || this.submitting() || !this.token) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.reset
      .resetPassword(this.token, this.form.getRawValue().password)
      .subscribe({
        next: () =>
          this.router.navigate(['/login'], {
            queryParams: { reset: 'done' },
          }),
        error: (err: unknown) => {
          this.submitting.set(false);
          const body = err instanceof HttpErrorResponse ? err.error : null;
          this.error.set(
            isApiError(body)
              ? body.message
              : 'Could not reset your password. The link may have expired.',
          );
        },
      });
  }
}
