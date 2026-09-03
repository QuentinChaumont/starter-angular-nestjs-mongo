import { DOCUMENT } from '@angular/common';
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isApiError } from '@org/shared-contracts';
import type {
  ConnectedAccounts,
  OidcProviderInfo,
  SessionInfo,
  TwoFactorSetupResponse,
  UserProfile,
} from '@org/shared-contracts';
import { AuthService, ResetService } from '@org/frontend-auth';
import { DialogService, NotificationService } from '@org/frontend-feedback';
import {
  AsyncButtonDirective,
  CopyButton,
  FormErrors,
  PageHeader,
  PasswordRevealButton,
  RelativeTime,
  StatusBadge,
} from '@org/frontend-ui';
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
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    PasswordRevealButton,
    AsyncButtonDirective,
    CopyButton,
    FormErrors,
    PageHeader,
    RelativeTime,
    StatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="profile">
      <lib-page-header title="Profile">
        @if (roleLabel()) {
          <span class="profile__roles" actions>{{ roleLabel() }}</span>
        }
      </lib-page-header>

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
                  [libAsyncButton]="savingName()"
                  [busyDisabled]="nameForm.invalid"
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

              <p class="profile__status-line">
                <lib-status-badge
                  [tone]="p.emailVerifiedAt ? 'success' : 'danger'"
                >
                  {{ p.emailVerifiedAt ? 'Verified' : 'Not verified' }}
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

                @if (!p.emailVerifiedAt) {
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
              <lib-form-errors
                [control]="passwordForm.controls.newPassword"
                [messages]="{
                  minlength:
                    'At least ' + minPasswordLength + ' characters.',
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
          </div>
        </section>

        <!-- two-factor authentication -->
        <section class="panel">
          <div class="panel__head">
            <h2>Two-factor authentication</h2>
            <lib-status-badge
              [tone]="p.twoFactorEnabled ? 'success' : 'neutral'"
              >{{ p.twoFactorEnabled ? 'On' : 'Off' }}</lib-status-badge
            >
          </div>
          <div class="panel__body">
            @if (tfaMode() === 'idle') {
              <p class="profile__hint">
                Require a code from an authenticator app when signing in.
              </p>
              @if (tfaError()) {
                <p class="profile__error" role="alert">{{ tfaError() }}</p>
              }
              @if (!p.twoFactorEnabled) {
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
                <form
                  [formGroup]="tfaDisableForm"
                  (ngSubmit)="disableTwoFactor()"
                >
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
                Scan this with your authenticator app, or enter the key
                manually, then type the 6-digit code it shows.
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
                Two-factor is on. Save these backup codes somewhere safe —
                each works once if you lose your authenticator, and they
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
          </div>
        </section>

        <!-- connected accounts -->
        <section class="panel">
          <div class="panel__head"><h2>Connected accounts</h2></div>
          <div class="panel__body">
            <p class="profile__hint">
              Ways to sign in to this account. Keep at least one.
            </p>

            <ul class="accounts">
              <li class="accounts__row">
                <div class="accounts__meta">
                  <span class="accounts__name">Password</span>
                  <span class="accounts__sub">
                    {{ connected()?.hasPassword ? 'Set' : 'Not set' }}
                  </span>
                </div>
                @if (connected() && !connected()!.hasPassword) {
                  <a mat-stroked-button routerLink="/forgot-password">
                    Set a password
                  </a>
                }
              </li>

              @for (
                identity of connected()?.identities ?? [];
                track identity.provider
              ) {
                <li class="accounts__row">
                  <div class="accounts__meta">
                    <span class="accounts__name">{{ identity.label }}</span>
                    @if (identity.email) {
                      <span class="accounts__sub">{{ identity.email }}</span>
                    }
                  </div>
                  <button
                    mat-stroked-button
                    type="button"
                    [libAsyncButton]="busyProvider() === identity.provider"
                    (click)="unlink(identity.provider)"
                  >
                    Disconnect
                  </button>
                </li>
              }

              @for (provider of connectable(); track provider.id) {
                <li class="accounts__row">
                  <div class="accounts__meta">
                    <span class="accounts__name">{{ provider.label }}</span>
                    <span class="accounts__sub">Not connected</span>
                  </div>
                  <button
                    mat-stroked-button
                    type="button"
                    [libAsyncButton]="busyProvider() === provider.id"
                    (click)="connect(provider.id)"
                  >
                    Connect
                  </button>
                </li>
              }
            </ul>

            @if (accountsError()) {
              <p class="profile__error" role="alert">{{ accountsError() }}</p>
            }
          </div>
        </section>

        <!-- devices / sessions -->
        <section class="panel">
          <div class="panel__head">
            <h2>Devices</h2>
            @if (sessions().length > 1) {
              <button
                mat-stroked-button
                type="button"
                [libAsyncButton]="sessionsBusy()"
                (click)="signOutOthers()"
              >
                Sign out everywhere else
              </button>
            }
          </div>
          <div class="panel__body">
            <p class="profile__hint">
              Every browser or device currently signed in to your account.
            </p>
            <ul class="accounts">
              @for (session of sessions(); track session.id) {
                <li class="accounts__row">
                  <div class="accounts__meta">
                    <span class="accounts__name">
                      {{ session.userAgent || 'Unknown device' }}
                      @if (session.current) {
                        <lib-status-badge tone="success">This device</lib-status-badge>
                      }
                    </span>
                    <span class="accounts__sub">
                      {{ session.ip || 'no IP' }} · last active
                      <lib-relative-time [value]="session.lastUsedAt" />
                    </span>
                  </div>
                  @if (!session.current) {
                    <button
                      mat-stroked-button
                      type="button"
                      [libAsyncButton]="sessionsBusy()"
                      (click)="signOut(session.id)"
                    >
                      Sign out
                    </button>
                  }
                </li>
              }
            </ul>
            @if (sessionsError()) {
              <p class="profile__error" role="alert">{{ sessionsError() }}</p>
            }
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
                  [libAsyncButton]="deleting()"
                  [busyDisabled]="deleteForm.invalid"
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
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--app-space-3);
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
    .profile__status-line {
      margin: 0;
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
    .accounts {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
    .accounts__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--app-space-3);
      padding-block: var(--app-space-3);
      border-block-start: var(--app-border-hairline);
    }
    .accounts__row:first-child {
      border-block-start: none;
      padding-block-start: 0;
    }
    .accounts__meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .accounts__name {
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .accounts__sub {
      font: 500 0.6875rem/1.3 var(--app-font-mono);
      letter-spacing: 0.02em;
      color: color-mix(in srgb, var(--app-color-on-surface) 55%, transparent);
      overflow-wrap: anywhere;
    }
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
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ProfileService);
  private readonly reset = inject(ResetService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
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

  protected readonly connected = signal<ConnectedAccounts | null>(null);
  protected readonly providers = signal<OidcProviderInfo[]>([]);
  protected readonly accountsError = signal<string | null>(null);
  /** Provider id whose Connect/Disconnect button is mid-request. */
  protected readonly busyProvider = signal<string | null>(null);

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

  protected readonly sessions = signal<SessionInfo[]>([]);
  protected readonly sessionsBusy = signal(false);
  protected readonly sessionsError = signal<string | null>(null);

  protected readonly roleLabel = computed(() =>
    (this.profile()?.roles ?? []).join(', '),
  );

  /** Active providers not yet linked — the ones worth a "Connect" button. */
  protected readonly connectable = computed(() => {
    const linked = new Set(
      (this.connected()?.identities ?? []).map((i) => i.provider),
    );
    return this.providers().filter((p) => !linked.has(p.id));
  });

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
    this.loadProfile();
    this.auth.oidcProviders().subscribe((providers) => {
      this.providers.set(providers);
    });
    this.loadConnectedAccounts();
    this.loadSessions();
    this.consumeLinkResult();
  }

  private loadSessions(): void {
    this.service.listSessions().subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: () => this.sessionsError.set('Could not load your devices.'),
    });
  }

  protected signOut(id: string): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessionsError.set(null);
    this.service.revokeSession(id).subscribe({
      next: () => {
        this.sessionsBusy.set(false);
        this.notify?.success('Device signed out.');
        this.loadSessions();
      },
      error: (err: unknown) => {
        this.sessionsBusy.set(false);
        this.sessionsError.set(apiMessage(err, 'Could not sign out that device.'));
      },
    });
  }

  protected signOutOthers(): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessionsError.set(null);
    this.service.revokeOtherSessions().subscribe({
      next: () => {
        this.sessionsBusy.set(false);
        this.notify?.success('Signed out everywhere else.');
        this.loadSessions();
      },
      error: (err: unknown) => {
        this.sessionsBusy.set(false);
        this.sessionsError.set(
          apiMessage(err, 'Could not sign out the other devices.'),
        );
      },
    });
  }

  private loadProfile(): void {
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

  private loadConnectedAccounts(): void {
    this.service.getConnectedAccounts().subscribe({
      next: (accounts) => this.connected.set(accounts),
      error: () =>
        this.accountsError.set('Could not load your connected accounts.'),
    });
  }

  /** Reads the `?linked` / `?linkError` params the OIDC "Connect" callback
   * bounces back with, shows a toast, then scrubs them from the URL. */
  private consumeLinkResult(): void {
    const params = this.route.snapshot.queryParamMap;
    const linked = params.get('linked');
    const linkError = params.get('linkError');
    if (!linked && !linkError) {
      return;
    }
    if (linked) {
      this.notify?.success('Account connected.');
    }
    if (linkError) {
      const message =
        linkError === 'IDENTITY_ALREADY_LINKED'
          ? 'That account is already linked to another user.'
          : 'Could not connect that account.';
      this.notify?.error(message);
      this.accountsError.set(message);
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  protected connect(provider: string): void {
    if (this.busyProvider()) return;
    this.busyProvider.set(provider);
    this.accountsError.set(null);
    this.service.startIdentityLink(provider).subscribe({
      next: ({ authorizationUrl }) => {
        this.document.location.href = authorizationUrl;
      },
      error: (err: unknown) => {
        this.busyProvider.set(null);
        this.accountsError.set(
          apiMessage(err, 'Could not start connecting that account.'),
        );
      },
    });
  }

  protected unlink(provider: string): void {
    if (this.busyProvider()) return;
    this.busyProvider.set(provider);
    this.accountsError.set(null);
    this.service.unlinkIdentity(provider).subscribe({
      next: () => {
        this.busyProvider.set(null);
        this.notify?.success('Account disconnected.');
        this.loadConnectedAccounts();
      },
      error: (err: unknown) => {
        this.busyProvider.set(null);
        this.accountsError.set(
          apiMessage(err, 'Could not disconnect that account.'),
        );
      },
    });
  }

  /* ---- two-factor authentication (V2.2 step 43) ---- */

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
        this.tfaError.set(
          apiMessage(err, 'Could not start two-factor setup.'),
        );
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
    this.loadProfile();
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
          this.loadProfile();
        },
        error: (err: unknown) => {
          this.tfaBusy.set(false);
          this.tfaError.set(
            apiMessage(err, 'Could not disable two-factor.'),
          );
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
