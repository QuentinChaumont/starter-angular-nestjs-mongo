import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { isApiError } from '@org/shared-contracts';
import type { UserProfile } from '@org/shared-contracts';
import { AuthService } from '@org/frontend-auth';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import { ProfileService } from './profile.service';

const MIN_PASSWORD_LENGTH = 8;

function apiMessage(err: unknown, fallback: string): string {
  const body = err instanceof HttpErrorResponse ? err.error : null;
  return isApiError(body) ? body.message : fallback;
}

@Component({
  selector: 'lib-profile-page',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="profile">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      @if (profile(); as p) {
        <mat-card>
          <mat-card-header
            ><mat-card-title>Your profile</mat-card-title></mat-card-header
          >
          <mat-card-content>
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
              <div class="profile__row">
                <mat-form-field appearance="outline">
                  <mat-label>First name</mat-label>
                  <input
                    matInput
                    formControlName="firstName"
                    autocomplete="given-name"
                  />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Last name</mat-label>
                  <input
                    matInput
                    formControlName="lastName"
                    autocomplete="family-name"
                  />
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input
                  matInput
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                />
                <mat-hint>
                  {{ p.emailVerifiedAt ? 'Verified' : 'Not verified' }} · roles:
                  {{ p.roles.length ? p.roles.join(', ') : 'none' }}
                </mat-hint>
              </mat-form-field>

              @if (profileError()) {
                <p class="profile__error" role="alert">{{ profileError() }}</p>
              }

              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="profileForm.invalid || savingProfile()"
              >
                Save
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header
            ><mat-card-title>Change password</mat-card-title></mat-card-header
          >
          <mat-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="savePassword()">
              <mat-form-field appearance="outline">
                <mat-label>Current password</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>New password</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="newPassword"
                  autocomplete="new-password"
                />
                <mat-hint>At least {{ minPasswordLength }} characters</mat-hint>
              </mat-form-field>

              @if (passwordError()) {
                <p class="profile__error" role="alert">{{ passwordError() }}</p>
              }

              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="passwordForm.invalid || savingPassword()"
              >
                Update password
              </button>
              <p class="profile__hint">
                Changing your password signs out your other devices.
              </p>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="profile__danger">
          <mat-card-header
            ><mat-card-title>Delete account</mat-card-title></mat-card-header
          >
          <mat-card-content>
            <form [formGroup]="deleteForm" (ngSubmit)="deleteAccount()">
              <p class="profile__hint">
                This permanently erases your account and cannot be undone.
                Confirm with your password.
              </p>
              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="password"
                  autocomplete="current-password"
                />
              </mat-form-field>

              @if (deleteError()) {
                <p class="profile__error" role="alert">{{ deleteError() }}</p>
              }

              <button
                mat-stroked-button
                color="warn"
                type="submit"
                [disabled]="deleteForm.invalid || deleting()"
              >
                Delete my account
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      } @else if (loadError()) {
        <p role="alert">{{ loadError() }}</p>
      }
    </section>
  `,
  styles: `
    .profile {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 560px;
    }
    .profile form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .profile__row {
      display: flex;
      gap: 8px;
    }
    .profile__row mat-form-field {
      flex: 1;
    }
    .profile__error {
      color: var(--app-color-error);
      margin: 0;
    }
    .profile__hint {
      opacity: 0.7;
      font-size: 0.85rem;
      margin: 4px 0 0;
    }
    .profile__danger {
      border: 1px solid var(--app-color-error, #b3261e);
    }
  `,
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(DialogService, { optional: true });
  private readonly notify = inject(NotificationService, { optional: true });

  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly savingProfile = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: [
      '',
      [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)],
    ],
  });

  protected readonly deleteForm = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  constructor() {
    this.service.getProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.profileForm.patchValue({
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load your profile.');
        this.loading.set(false);
      },
    });
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile()) return;
    const value = this.profileForm.getRawValue();
    const emailChanged =
      value.email.trim().toLowerCase() !==
      (this.profile()?.email ?? '').toLowerCase();

    this.savingProfile.set(true);
    this.profileError.set(null);
    this.service.updateProfile(value).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.savingProfile.set(false);
        this.notify?.success(
          emailChanged
            ? 'Saved. Check your new inbox to verify the address.'
            : 'Profile updated.',
        );
        this.auth.loadMe().subscribe({ error: () => undefined });
      },
      error: (err: unknown) => {
        this.savingProfile.set(false);
        this.profileError.set(apiMessage(err, 'Could not save your profile.'));
      },
    });
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword()) return;
    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.service.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.notify?.success(
          'Password changed. Other devices were signed out.',
        );
      },
      error: (err: unknown) => {
        this.savingPassword.set(false);
        this.passwordError.set(
          apiMessage(err, 'Could not change your password.'),
        );
      },
    });
  }

  protected deleteAccount(): void {
    if (this.deleteForm.invalid || this.deleting()) return;
    const password = this.deleteForm.getRawValue().password;

    const run = () => {
      this.deleting.set(true);
      this.deleteError.set(null);
      this.service.deleteAccount(password).subscribe({
        next: () => {
          this.auth.logout().subscribe(() => this.router.navigate(['/login']));
        },
        error: (err: unknown) => {
          this.deleting.set(false);
          this.deleteError.set(
            apiMessage(err, 'Could not delete your account.'),
          );
        },
      });
    };

    if (!this.dialog) {
      run();
      return;
    }
    this.dialog
      .confirm({
        title: 'Delete your account?',
        message:
          'This permanently erases your account and all its data. This cannot be undone.',
        confirmLabel: 'Delete forever',
        cancelLabel: 'Keep my account',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) run();
      });
  }
}
