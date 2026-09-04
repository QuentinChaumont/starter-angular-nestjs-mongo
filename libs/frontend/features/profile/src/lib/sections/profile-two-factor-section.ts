import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { TwoFactorSetupResponse, UserProfile } from '@org/shared-contracts';
import { NotificationService } from '@org/frontend-feedback';
import {
  AsyncButtonDirective,
  CopyButton,
  PasswordRevealButton,
  StatusBadge,
} from '@org/frontend-ui';
import { ProfileService } from '../profile.service';
import { PROFILE_FORM_STYLES, apiMessage } from '../profile-shared';
import { ProfilePanel } from '../ui/profile-panel';

/** TOTP two-factor: enable (QR → confirm → one-time backup codes) or
 * disable (password-confirmed). Any state change tells the page to
 * reload the profile so the On/Off badge follows. */
@Component({
  selector: 'lib-profile-two-factor-section',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncButtonDirective,
    CopyButton,
    PasswordRevealButton,
    StatusBadge,
    ProfilePanel,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-profile-panel heading="Two-factor authentication">
      <lib-status-badge
        panelActions
        [tone]="profile().twoFactorEnabled ? 'success' : 'neutral'"
        >{{ profile().twoFactorEnabled ? 'On' : 'Off' }}</lib-status-badge
      >

      @if (tfaMode() === 'idle') {
        <p class="profile__hint">
          Require a code from an authenticator app when signing in.
        </p>
        @if (tfaError()) {
          <p class="profile__error" role="alert">{{ tfaError() }}</p>
        }
        @if (!profile().twoFactorEnabled) {
          <div class="profile__actions">
            <button
              mat-flat-button
              color="primary"
              type="button"
              [libAsyncButton]="tfaBusy()"
              (click)="startTwoFactor()"
            >
              Enable two-factor
            </button>
          </div>
        } @else {
          <form [formGroup]="tfaDisableForm" (ngSubmit)="disableTwoFactor()">
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input
                #tfaPw
                matInput
                type="password"
                formControlName="password"
                autocomplete="current-password"
              />
              <lib-password-reveal-button matSuffix [input]="tfaPw" />
            </mat-form-field>
            <div class="profile__actions">
              <button
                mat-stroked-button
                color="warn"
                type="submit"
                [libAsyncButton]="tfaBusy()"
                [busyDisabled]="tfaDisableForm.invalid"
              >
                Disable two-factor
              </button>
            </div>
          </form>
        }
      }

      @if (tfaMode() === 'enrolling' && tfaSetup(); as setup) {
        <p class="profile__hint">
          Scan this with your authenticator app, or enter the key manually,
          then type the 6-digit code it shows.
        </p>
        <img class="tfa__qr" [src]="setup.qrDataUri" alt="2FA QR code" />
        <p class="tfa__secret">{{ setup.secret }}</p>

        <form [formGroup]="tfaConfirmForm" (ngSubmit)="confirmTwoFactor()">
          <mat-form-field appearance="outline">
            <mat-label>6-digit code</mat-label>
            <input
              matInput
              formControlName="code"
              inputmode="numeric"
              autocomplete="one-time-code"
            />
          </mat-form-field>
          @if (tfaError()) {
            <p class="profile__error" role="alert">{{ tfaError() }}</p>
          }
          <div class="profile__actions">
            <button
              mat-flat-button
              color="primary"
              type="submit"
              [libAsyncButton]="tfaBusy()"
              [busyDisabled]="tfaConfirmForm.invalid"
            >
              Confirm
            </button>
            <button
              mat-stroked-button
              type="button"
              [disabled]="tfaBusy()"
              (click)="cancelTwoFactor()"
            >
              Cancel
            </button>
          </div>
        </form>
      }

      @if (tfaMode() === 'backup') {
        <p class="profile__hint">
          Two-factor is on. Save these backup codes somewhere safe — each
          works once if you lose your authenticator, and they
          <strong>won't be shown again</strong>.
        </p>
        <ul class="tfa__codes">
          @for (code of tfaBackupCodes(); track code) {
            <li>{{ code }}</li>
          }
        </ul>
        <div class="profile__actions">
          <lib-copy-button
            [value]="tfaBackupCodes().join('\n')"
            label="Copy backup codes"
          />
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="finishTwoFactor()"
          >
            I've saved my backup codes
          </button>
        </div>
      }
    </lib-profile-panel>
  `,
  styles: [
    PROFILE_FORM_STYLES,
    `
      .tfa__qr {
        width: 168px;
        height: 168px;
        image-rendering: pixelated;
        border: var(--app-border-hairline);
        border-radius: var(--app-radius-sm);
        background: #fff;
        padding: var(--app-space-2);
      }
      .tfa__secret {
        margin: 0;
        font: 600 0.8125rem/1.4 var(--app-font-mono);
        letter-spacing: 0.08em;
        word-break: break-all;
      }
      .tfa__codes {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--app-space-1) var(--app-space-3);
        margin: 0;
        padding: var(--app-space-3);
        list-style: none;
        border: var(--app-border-hairline);
        border-radius: var(--app-radius-sm);
        font: 600 0.8125rem/1.6 var(--app-font-mono);
        letter-spacing: 0.04em;
      }
    `,
  ],
})
export class ProfileTwoFactorSection {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly notify = inject(NotificationService, { optional: true });

  readonly profile = input.required<UserProfile>();
  /** Emitted after enable / disable so the page reloads the profile. */
  readonly changed = output<void>();

  protected readonly tfaMode = signal<'idle' | 'enrolling' | 'backup'>('idle');
  protected readonly tfaSetup = signal<TwoFactorSetupResponse | null>(null);
  protected readonly tfaBackupCodes = signal<string[]>([]);
  protected readonly tfaBusy = signal(false);
  protected readonly tfaError = signal<string | null>(null);

  protected readonly tfaConfirmForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
  });
  protected readonly tfaDisableForm = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  protected startTwoFactor(): void {
    if (this.tfaBusy()) return;
    this.tfaBusy.set(true);
    this.tfaError.set(null);
    this.service.setupTwoFactor().subscribe({
      next: (setup) => {
        this.tfaBusy.set(false);
        this.tfaSetup.set(setup);
        this.tfaConfirmForm.reset();
        this.tfaMode.set('enrolling');
      },
      error: (err: unknown) => {
        this.tfaBusy.set(false);
        this.tfaError.set(apiMessage(err, 'Could not start two-factor setup.'));
      },
    });
  }

  protected confirmTwoFactor(): void {
    if (this.tfaConfirmForm.invalid || this.tfaBusy()) return;
    this.tfaBusy.set(true);
    this.tfaError.set(null);
    this.service
      .confirmTwoFactor(this.tfaConfirmForm.getRawValue().code.trim())
      .subscribe({
        next: ({ backupCodes }) => {
          this.tfaBusy.set(false);
          this.tfaBackupCodes.set(backupCodes);
          this.tfaSetup.set(null);
          this.tfaMode.set('backup');
        },
        error: (err: unknown) => {
          this.tfaBusy.set(false);
          this.tfaError.set(apiMessage(err, 'That code is not valid.'));
        },
      });
  }

  protected cancelTwoFactor(): void {
    this.tfaSetup.set(null);
    this.tfaError.set(null);
    this.tfaMode.set('idle');
  }

  protected finishTwoFactor(): void {
    this.tfaBackupCodes.set([]);
    this.tfaMode.set('idle');
    this.notify?.success('Two-factor authentication is on.');
    this.changed.emit();
  }

  protected disableTwoFactor(): void {
    if (this.tfaDisableForm.invalid || this.tfaBusy()) return;
    this.tfaBusy.set(true);
    this.tfaError.set(null);
    this.service
      .disableTwoFactor(this.tfaDisableForm.getRawValue().password)
      .subscribe({
        next: () => {
          this.tfaBusy.set(false);
          this.tfaDisableForm.reset();
          this.notify?.success('Two-factor authentication is off.');
          this.changed.emit();
        },
        error: (err: unknown) => {
          this.tfaBusy.set(false);
          this.tfaError.set(apiMessage(err, 'Could not disable two-factor.'));
        },
      });
  }
}
