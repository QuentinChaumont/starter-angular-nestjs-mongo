import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ResetService } from './reset.service';

@Component({
  selector: 'lib-forgot-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="forgot">
      @if (submitting()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }
      <h1>{{ 'auth.forgot.title' | transloco }}</h1>

      @if (done()) {
        <p role="status">{{ 'auth.forgot.done' | transloco }}</p>
        <a routerLink="/login">{{ 'auth.forgot.backToLogin' | transloco }}</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'common.email' | transloco }}</mat-label>
            <input
              matInput
              type="email"
              formControlName="email"
              autocomplete="username"
            />
          </mat-form-field>

          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid || submitting()"
          >
            {{ 'auth.forgot.submit' | transloco }}
          </button>
        </form>
        <a routerLink="/login">{{ 'auth.forgot.backToLogin' | transloco }}</a>
      }
    </section>
  `,
  styles: `
    .forgot {
      max-width: 360px;
      margin: 8vh auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
    }
    .forgot form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `,
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly reset = inject(ResetService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly submitting = signal(false);
  protected readonly done = signal(false);

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    // Response is 202 whether or not the address matches — resolve the same
    // way on error so the UI never reveals it either.
    this.reset.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
    });
  }
}
