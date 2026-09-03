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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { isApiError } from '@org/shared-contracts';
import {
  AsyncButtonDirective,
  FormErrors,
  PasswordRevealButton,
} from '@org/frontend-ui';
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
    PasswordRevealButton,
    AsyncButtonDirective,
    FormErrors,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="reset">
      <h1>{{ 'auth.reset.title' | transloco }}</h1>

      @if (!token) {
        <p class="reset__error" role="alert">
          {{ 'auth.reset.missingToken' | transloco }}
        </p>
        <a routerLink="/forgot-password">
          {{ 'auth.reset.requestNew' | transloco }}
        </a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.reset.newPassword' | transloco }}</mat-label>
            <input
              #password
              matInput
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
            <lib-password-reveal-button matSuffix [input]="password" />
            <mat-hint>
              {{
                'auth.reset.passwordHint'
                  | transloco: { count: minPasswordLength }
              }}
            </mat-hint>
          </mat-form-field>
          <lib-form-errors
            [control]="form.controls.password"
            [messages]="{
              minlength:
                'auth.reset.passwordHint'
                  | transloco: { count: minPasswordLength },
            }"
          />

          @if (error()) {
            <p class="reset__error" role="alert">{{ error() }}</p>
          }

          <button
            mat-flat-button
            color="primary"
            type="submit"
            [libAsyncButton]="submitting()"
            [busyDisabled]="form.invalid"
          >
            {{ 'auth.reset.submit' | transloco }}
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
  private readonly transloco = inject(TranslocoService);

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
              : this.transloco.translate('auth.reset.failed'),
          );
        },
      });
  }
}
