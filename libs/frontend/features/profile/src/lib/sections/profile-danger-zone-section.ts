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
import { Router } from '@angular/router';
import { AuthService } from '@org/frontend-auth';
import { DialogService, type HasUnsavedChanges } from '@org/frontend-feedback';
import { AsyncButtonDirective, PasswordRevealButton } from '@org/frontend-ui';
import { ProfileService } from '../profile.service';
import { PROFILE_FORM_STYLES, apiMessage } from '../profile-shared';
import { ProfilePanel } from '../ui/profile-panel';

/** Permanent account deletion — password-confirmed, and (when the feedback
 * brick is present) behind a confirm dialog. */
@Component({
  selector: 'lib-profile-danger-zone-section',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncButtonDirective,
    PasswordRevealButton,
    ProfilePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-profile-panel heading="Delete account" [danger]="true">
      <form [formGroup]="deleteForm" (ngSubmit)="deleteAccount()">
        <p class="profile__hint">
          This permanently erases your account and cannot be undone. Confirm
          with your password.
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
            [libAsyncButton]="deleting()"
            [busyDisabled]="deleteForm.invalid"
          >
            Delete my account
          </button>
        </div>
      </form>
    </lib-profile-panel>
  `,
  styles: PROFILE_FORM_STYLES,
})
export class ProfileDangerZoneSection implements HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(DialogService, { optional: true });

  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected readonly deleteForm = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  hasUnsavedChanges(): boolean {
    return !this.deleting() && this.deleteForm.dirty;
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
          this.deleteError.set(apiMessage(err, 'Could not delete your account.'));
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
