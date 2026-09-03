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
    PasswordRevealButton,
    AsyncButtonDirective,
    FormErrors,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="register">
      <h1>{{ 'auth.register.title' | transloco }}</h1>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="register__row">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.register.firstName' | transloco }}</mat-label>
            <input
              matInput
              formControlName="firstName"
              autocomplete="given-name"
            />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'auth.register.lastName' | transloco }}</mat-label>
            <input
              matInput
              formControlName="lastName"
              autocomplete="family-name"
            />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'common.email' | transloco }}</mat-label>
          <input
            matInput
            type="email"
            formControlName="email"
            autocomplete="username"
          />
        </mat-form-field>
        <lib-form-errors [control]="form.controls.email" />

        <mat-form-field appearance="outline">
          <mat-label>{{ 'common.password' | transloco }}</mat-label>
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
              'auth.register.passwordHint'
                | transloco: { count: minPasswordLength }
            }}
          </mat-hint>
        </mat-form-field>
        <lib-form-errors
          [control]="form.controls.password"
          [messages]="{
            minlength:
              'auth.register.passwordHint'
                | transloco: { count: minPasswordLength },
          }"
        />

        @if (error()) {
          <p class="register__error" role="alert">{{ error() }}</p>
        }

        <button
          mat-flat-button
          color="primary"
          type="submit"
          [libAsyncButton]="submitting()"
          [busyDisabled]="form.invalid"
        >
          {{ 'auth.register.submit' | transloco }}
        </button>
      </form>

      <a routerLink="/login">{{ 'auth.register.haveAccount' | transloco }}</a>
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
  private readonly transloco = inject(TranslocoService);

  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)],
    ],
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
          isApiError(body)
            ? body.message
            : this.transloco.translate('auth.register.failed'),
        );
      },
    });
  }
}
