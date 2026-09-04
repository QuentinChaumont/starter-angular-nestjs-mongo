import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  ConnectedAccounts,
  OidcProviderInfo,
} from '@org/shared-contracts';
import { AuthService } from '@org/frontend-auth';
import { NotificationService } from '@org/frontend-feedback';
import { AsyncButtonDirective } from '@org/frontend-ui';
import { ProfileService } from '../profile.service';
import {
  PROFILE_FORM_STYLES,
  PROFILE_LIST_STYLES,
  apiMessage,
} from '../profile-shared';
import { ProfilePanel } from '../ui/profile-panel';

/** The ways to sign in to this account: the password plus any linked OIDC
 * providers, with Connect / Disconnect for the configured ones. Self-loads
 * and also consumes the `?linked` / `?linkError` params the link callback
 * bounces back with. */
@Component({
  selector: 'lib-profile-connected-accounts-section',
  imports: [RouterLink, MatButtonModule, AsyncButtonDirective, ProfilePanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-profile-panel heading="Connected accounts">
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
            <a mat-stroked-button routerLink="/forgot-password">Set a password</a>
          }
        </li>

        @for (identity of connected()?.identities ?? []; track identity.provider) {
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
    </lib-profile-panel>
  `,
  styles: [PROFILE_FORM_STYLES, PROFILE_LIST_STYLES],
})
export class ProfileConnectedAccountsSection {
  private readonly service = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly notify = inject(NotificationService, { optional: true });

  protected readonly connected = signal<ConnectedAccounts | null>(null);
  protected readonly providers = signal<OidcProviderInfo[]>([]);
  protected readonly accountsError = signal<string | null>(null);
  /** Provider id whose Connect/Disconnect button is mid-request. */
  protected readonly busyProvider = signal<string | null>(null);

  /** Active providers not yet linked — the ones worth a "Connect" button. */
  protected readonly connectable = computed(() => {
    const linked = new Set(
      (this.connected()?.identities ?? []).map((i) => i.provider),
    );
    return this.providers().filter((p) => !linked.has(p.id));
  });

  constructor() {
    this.auth.oidcProviders().subscribe((providers) => {
      this.providers.set(providers);
    });
    this.load();
    this.consumeLinkResult();
  }

  private load(): void {
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
        this.load();
      },
      error: (err: unknown) => {
        this.busyProvider.set(null);
        this.accountsError.set(
          apiMessage(err, 'Could not disconnect that account.'),
        );
      },
    });
  }
}
