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
import { NotificationService, type HasUnsavedChanges } from '@org/frontend-feedback';
import {
  AsyncButtonDirective,
  FormErrors,
  PasswordRevealButton,
} from '@org/frontend-ui';
import { ProfileService } from '../profile.service';
import { MIN_PASSWORD_LENGTH, PROFILE_FORM_STYLES, apiMessage } from '../profile-shared';
import { ProfilePanel } from '../ui/profile-panel';

/** Change password — confirmed with the current one; the server signs out
 * the account's other devices on success. */
@Component({
  selector: 'lib-profile-password-section',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncButtonDirective,
    FormErrors,
    PasswordRevealButton,
    ProfilePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-profile-panel heading="Change password">
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
        <lib-form-errors
          [control]="passwordForm.controls.newPassword"
          [messages]="{
            minlength: 'At least ' + minPasswordLength + ' characters.',
          }"
        />

        @if (passwordError()) {
          <p class="profile__error" role="alert">{{ passwordError() }}</p>
        }

        <div class="profile__actions">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [libAsyncButton]="savingPassword()"
            [busyDisabled]="passwordForm.invalid"
          >
            Update password
          </button>
        </div>
        <p class="profile__hint">
          Changing your password signs out your other devices.
        </p>
      </form>
    </lib-profile-panel>
  `,
  styles: PROFILE_FORM_STYLES,
})
export class ProfilePasswordSection implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly notify = inject(NotificationService, { optional: true });

  protected readonly minPasswordLength = MIN_PASSWORD_LENGTH;
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: [
      '',
      [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)],
    ],
  });

  hasUnsavedChanges(): boolean {
    return !this.savingPassword() && this.passwordForm.dirty;
  }

  protected savePassword(): void {
    if (this.passwordForm.invalid || this.savingPassword()) return;
    this.savingPassword.set(true);
    this.passwordError.set(null);
    this.service.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.notify?.success('Password changed. Other devices were signed out.');
      },
      error: (err: unknown) => {
        this.savingPassword.set(false);
        this.passwordError.set(apiMessage(err, 'Could not change your password.'));
      },
    });
  }
}
