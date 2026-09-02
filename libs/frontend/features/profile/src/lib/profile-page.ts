import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { isApiError } from '@org/shared-contracts';
import type { UserProfile } from '@org/shared-contracts';
import { AuthService, ResetService } from '@org/frontend-auth';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import { PasswordRevealButton } from '@org/frontend-ui';
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    PasswordRevealButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="profile">
      <header class="profile__toolbar">
        <h1 class="profile__title">Profile</h1>
        @if (roleLabel()) {
          <span class="profile__roles">{{ roleLabel() }}</span>
        }
      </header>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      @if (profile(); as p) {
        <!-- name -->
        <section class="panel">
          <div class="panel__head"><h2>Your profile</h2></div>
          <div class="panel__body">
            <form [formGroup]="nameForm" (ngSubmit)="saveName()">
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

              @if (nameError()) {
                <p class="profile__error" role="alert">{{ nameError() }}</p>
              }

              <div class="profile__actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="nameForm.invalid || savingName()"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </section>

        <!-- email -->
        <section class="panel">
          <div class="panel__head"><h2>Email address</h2></div>
          <div class="panel__body">
            <form [formGroup]="emailForm" (ngSubmit)="saveEmail()">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input
                  matInput
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                />
              </mat-form-field>

              <p
                class="profile__status"
                [class.profile__status--ok]="p.emailVerifiedAt"
              >
                {{ p.emailVerifiedAt ? 'Verified' : 'Not verified' }}
              </p>

              @if (emailError()) {
                <p class="profile__error" role="alert">{{ emailError() }}</p>
              }

              <div class="profile__actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="
                    emailForm.invalid || savingEmail() || !emailDirty()
                  "
                >
                  Save email
                </button>

                @if (!p.emailVerifiedAt) {
                  <button
                    mat-stroked-button
                    type="button"
                    [disabled]="resending()"
                    (click)="resendVerification()"
                  >
                    Resend verification email
                  </button>
                }
              </div>

              @if (resendMessage()) {
                <p class="profile__hint" role="status">{{ resendMessage() }}</p>
              }
            </form>
          </div>
        </section>

        <!-- password -->
        <section class="panel">
          <div class="panel__head"><h2>Change password</h2></div>
          <div class="panel__body">
            <form [formGroup]="passwordForm" (ngSubmit)="savePassword()">
              <mat-form-field appearance="outline">
                <mat-label>Current password</mat-label>
                <input
                  #current
                  matInput
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
                <lib-password-reveal-button matSuffix [input]="current" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>New password</mat-label>
                <input
                  #next
                  matInput
                  type="password"
                  formControlName="newPassword"
                  autocomplete="new-password"
                />
                <lib-password-reveal-button matSuffix [input]="next" />
                <mat-hint>At least {{ minPasswordLength }} characters</mat-hint>
              </mat-form-field>

              @if (passwordError()) {
                <p class="profile__error" role="alert">{{ passwordError() }}</p>
              }

              <div class="profile__actions">
                <button
                  mat-flat-button
                  color="primary"
                  type="submit"
                  [disabled]="passwordForm.invalid || savingPassword()"
                >
                  Update password
                </button>
              </div>
              <p class="profile__hint">
                Changing your password signs out your other devices.
              </p>
            </form>
          </div>
        </section>

        <!-- delete -->
        <section class="panel panel--danger">
          <div class="panel__head"><h2>Delete account</h2></div>
          <div class="panel__body">
            <form [formGroup]="deleteForm" (ngSubmit)="deleteAccount()">
              <p class="profile__hint">
                This permanently erases your account and cannot be undone.
                Confirm with your password.
              </p>
              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input
                  #confirm
                  matInput
                  type="password"
                  formControlName="password"
                  autocomplete="current-password"
                />
                <lib-password-reveal-button matSuffix [input]="confirm" />
              </mat-form-field>

              @if (deleteError()) {
                <p class="profile__error" role="alert">{{ deleteError() }}</p>
              }

              <div class="profile__actions">
                <button
                  mat-stroked-button
                  color="warn"
                  type="submit"
                  [disabled]="deleteForm.invalid || deleting()"
                >
                  Delete my account
                </button>
              </div>
            </form>
          </div>
        </section>
      } @else if (loadError()) {
        <p class="profile__error" role="alert">{{ loadError() }}</p>
      }
    </section>
  `,
  styles: `
    .profile {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
      max-width: 560px;
    }
    .profile__toolbar {
      display: flex;
      align-items: baseline;
      gap: var(--app-space-3);
      padding-block-end: var(--app-space-3);
      border-block-end: var(--app-border-hairline);
    }
    .profile__title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .profile__roles {
      font: 500 0.6875rem/1 var(--app-font-mono);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--app-color-on-surface) 55%, transparent);
    }
    .panel {
      background: var(--app-color-surface);
      border: var(--app-border-hairline);
      border-radius: var(--app-radius-md);
    }
    .panel--danger {
      border-color: color-mix(
        in srgb,
        var(--app-color-error) 45%,
        var(--app-color-outline)
      );
    }
    .panel__head {
      padding: var(--app-space-3) var(--app-space-4);
      border-block-end: var(--app-border-hairline);
    }
    .panel__head h2 {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .panel--danger .panel__head h2 {
      color: var(--app-color-error);
    }
    .panel__body {
      padding: var(--app-space-4);
    }
    .profile form {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-3);
    }
    .profile__row {
      display: flex;
      gap: var(--app-space-2);
    }
    .profile__row mat-form-field {
      flex: 1;
    }
    .profile mat-form-field {
      width: 100%;
    }
    .profile__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--app-space-2);
      margin-block-start: 2px;
    }
    .profile__status {
      margin: 0;
      font: 500 0.6875rem/1 var(--app-font-mono);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--app-color-error);
    }
    .profile__status--ok {
      color: color-mix(in srgb, var(--app-color-on-surface) 60%, transparent);
    }
    .profile__error {
      color: var(--app-color-error);
      font-size: 0.8125rem;
      margin: 0;
    }
    .profile__hint {
      font-size: 0.8125rem;
      line-height: 1.5;
      color: color-mix(in srgb, var(--app-color-on-surface) 60%, transparent);
      margin: 2px 0 0;
    }
  `,
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly reset = inject(ResetService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(DialogService, { optional: true });
  private readonly notify = inject(NotificationService, { optional: true });

  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly savingName = signal(false);
  protected readonly nameError = signal<string | null>(null);
  protected readonly savingEmail = signal(false);
  protected readonly emailError = signal<string | null>(null);
  protected readonly resending = signal(false);
  protected readonly resendMessage = signal<string | null>(null);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly roleLabel = computed(() =>
    (this.profile()?.roles ?? []).join(', '),
  );

  protected readonly nameForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
  });

  protected readonly emailForm = this.fb.nonNullable.group({
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
        this.nameForm.patchValue({
          firstName: p.firstName,
          lastName: p.lastName,
        });
        this.emailForm.patchValue({ email: p.email });
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load your profile.');
        this.loading.set(false);
      },
    });
  }

  protected emailDirty(): boolean {
    const current = (this.profile()?.email ?? '').trim().toLowerCase();
    return this.emailForm.getRawValue().email.trim().toLowerCase() !== current;
  }

  protected saveName(): void {
    if (this.nameForm.invalid || this.savingName()) return;
    this.savingName.set(true);
    this.nameError.set(null);
    this.service.updateProfile(this.nameForm.getRawValue()).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.savingName.set(false);
        this.notify?.success('Profile updated.');
        this.auth.loadMe().subscribe({ error: () => undefined });
      },
      error: (err: unknown) => {
        this.savingName.set(false);
        this.nameError.set(apiMessage(err, 'Could not save your profile.'));
      },
    });
  }

  protected saveEmail(): void {
    if (this.emailForm.invalid || this.savingEmail() || !this.emailDirty()) {
      return;
    }
    this.savingEmail.set(true);
    this.emailError.set(null);
    this.resendMessage.set(null);
    this.service
      .updateProfile({ email: this.emailForm.getRawValue().email.trim() })
      .subscribe({
        next: (p) => {
          this.profile.set(p);
          this.emailForm.patchValue({ email: p.email });
          this.savingEmail.set(false);
          this.notify?.success(
            'Email updated. Check your new inbox to verify the address.',
          );
          this.auth.loadMe().subscribe({ error: () => undefined });
        },
        error: (err: unknown) => {
          this.savingEmail.set(false);
          this.emailError.set(apiMessage(err, 'Could not update your email.'));
        },
      });
  }

  protected resendVerification(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.resendMessage.set(null);
    this.reset.resendVerification().subscribe({
      next: () => {
        this.resending.set(false);
        this.resendMessage.set('Verification email sent.');
      },
      error: (err: unknown) => {
        this.resending.set(false);
        this.resendMessage.set(
          apiMessage(err, 'Could not send the verification email right now.'),
        );
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
