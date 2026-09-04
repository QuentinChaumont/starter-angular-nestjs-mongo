import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { UserProfile } from '@org/shared-contracts';
import { AuthService, ResetService } from '@org/frontend-auth';
import { NotificationService, type HasUnsavedChanges } from '@org/frontend-feedback';
import { AsyncButtonDirective, FormErrors, StatusBadge } from '@org/frontend-ui';
import { ProfileService } from '../profile.service';
import { PROFILE_FORM_STYLES, apiMessage } from '../profile-shared';
import { ProfilePanel } from '../ui/profile-panel';

/** Name and email address — the two editable identity fields. Both go
 * through `PATCH /users/me`; a successful save clears the form's dirty
 * flag and hands the fresh profile back to the page. */
@Component({
  selector: 'lib-profile-identity-section',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncButtonDirective,
    FormErrors,
    StatusBadge,
    ProfilePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-profile-panel heading="Your profile">
      <form [formGroup]="nameForm" (ngSubmit)="saveName()">
        <div class="profile__row">
          <mat-form-field appearance="outline">
            <mat-label>First name</mat-label>
            <input matInput formControlName="firstName" autocomplete="given-name" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Last name</mat-label>
            <input matInput formControlName="lastName" autocomplete="family-name" />
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
            [libAsyncButton]="savingName()"
            [busyDisabled]="nameForm.invalid"
          >
            Save
          </button>
        </div>
      </form>
    </lib-profile-panel>

    <lib-profile-panel heading="Email address">
      <form [formGroup]="emailForm" (ngSubmit)="saveEmail()">
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" />
        </mat-form-field>

        <p class="profile__status-line">
          <lib-status-badge [tone]="profile().emailVerifiedAt ? 'success' : 'danger'">
            {{ profile().emailVerifiedAt ? 'Verified' : 'Not verified' }}
          </lib-status-badge>
        </p>
        <lib-form-errors [control]="emailForm.controls.email" />

        @if (emailError()) {
          <p class="profile__error" role="alert">{{ emailError() }}</p>
        }

        <div class="profile__actions">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [libAsyncButton]="savingEmail()"
            [busyDisabled]="emailForm.invalid || !emailDirty()"
          >
            Save email
          </button>

          @if (!profile().emailVerifiedAt) {
            <button
              mat-stroked-button
              type="button"
              [libAsyncButton]="resending()"
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
    </lib-profile-panel>
  `,
  styles: PROFILE_FORM_STYLES,
})
export class ProfileIdentitySection implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly reset = inject(ResetService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService, { optional: true });

  readonly profile = input.required<UserProfile>();
  readonly profileChanged = output<UserProfile>();

  protected readonly savingName = signal(false);
  protected readonly nameError = signal<string | null>(null);
  protected readonly savingEmail = signal(false);
  protected readonly emailError = signal<string | null>(null);
  protected readonly resending = signal(false);
  protected readonly resendMessage = signal<string | null>(null);

  protected readonly nameForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
  });

  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    // Seed each form from the page's profile, but never stomp a field the
    // user is mid-edit on (an unrelated save elsewhere re-emits the profile).
    effect(() => {
      const p = this.profile();
      if (this.nameForm.pristine) {
        this.nameForm.setValue({ firstName: p.firstName, lastName: p.lastName });
      }
      if (this.emailForm.pristine) {
        this.emailForm.setValue({ email: p.email });
      }
    });
  }

  hasUnsavedChanges(): boolean {
    if (this.savingName() || this.savingEmail()) {
      return false;
    }
    return this.nameForm.dirty || this.emailForm.dirty;
  }

  protected emailDirty(): boolean {
    const current = (this.profile().email ?? '').trim().toLowerCase();
    return this.emailForm.getRawValue().email.trim().toLowerCase() !== current;
  }

  protected saveName(): void {
    if (this.nameForm.invalid || this.savingName()) return;
    this.savingName.set(true);
    this.nameError.set(null);
    this.service.updateProfile(this.nameForm.getRawValue()).subscribe({
      next: (p) => {
        this.savingName.set(false);
        this.nameForm.markAsPristine();
        this.notify?.success('Profile updated.');
        this.profileChanged.emit(p);
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
          this.savingEmail.set(false);
          this.emailForm.setValue({ email: p.email });
          this.emailForm.markAsPristine();
          this.notify?.success(
            'Email updated. Check your new inbox to verify the address.',
          );
          this.profileChanged.emit(p);
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
}
