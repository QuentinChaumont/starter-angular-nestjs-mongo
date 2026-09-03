import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { isApiError } from '@org/shared-contracts';
import { AuthService } from '../auth.service';

/**
 * The "enter your 6-digit code" step shown after a password or OIDC login
 * when the account has TOTP 2FA on (V2.2 step 43). Shared by the login page
 * and the OIDC callback.
 */
@Component({
  selector: 'lib-two-factor-prompt',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tfa">
      @if (submitting()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <h1>{{ 'auth.twoFactor.title' | transloco }}</h1>
      <p class="tfa__hint">{{ 'auth.twoFactor.hint' | transloco }}</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'auth.twoFactor.code' | transloco }}</mat-label>
          <input
            matInput
            formControlName="code"
            autocomplete="one-time-code"
            inputmode="numeric"
          />
        </mat-form-field>

        @if (error()) {
          <p class="tfa__error" role="alert">{{ error() }}</p>
        }

        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitting()"
        >
          {{ 'auth.twoFactor.verify' | transloco }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .tfa {
      max-width: 360px;
      margin: 8vh auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
    }
    .tfa form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .tfa__hint {
      margin: 0;
      font-size: 0.875rem;
      color: color-mix(in srgb, var(--app-color-on-surface) 65%, transparent);
    }
    .tfa__error {
      color: var(--app-color-error);
      margin: 0;
    }
  `,
})
export class TwoFactorPrompt {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly pendingToken = input.required<string>();
  readonly redirectTo = input('/app');

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
  });
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    this.auth
      .verifyTwoFactor(this.pendingToken(), this.form.getRawValue().code.trim())
      .subscribe({
        next: () => this.router.navigateByUrl(this.redirectTo()),
        error: (err: unknown) => {
          this.submitting.set(false);
          const body = err instanceof HttpErrorResponse ? err.error : null;
          this.error.set(
            isApiError(body)
              ? body.message
              : this.transloco.translate('auth.twoFactor.invalid'),
          );
        },
      });
  }
}
