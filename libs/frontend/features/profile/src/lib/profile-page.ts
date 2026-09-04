import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { UserProfile } from '@org/shared-contracts';
import { type HasUnsavedChanges } from '@org/frontend-feedback';
import { PageHeader } from '@org/frontend-ui';
import { ProfileService } from './profile.service';
import { ProfileConnectedAccountsSection } from './sections/profile-connected-accounts-section';
import { ProfileDangerZoneSection } from './sections/profile-danger-zone-section';
import { ProfileIdentitySection } from './sections/profile-identity-section';
import { ProfilePasswordSection } from './sections/profile-password-section';
import { ProfileSessionsSection } from './sections/profile-sessions-section';
import { ProfileTwoFactorSection } from './sections/profile-two-factor-section';

/**
 * `/app/profile` shell (V2.1 step 34). Loads the profile once and composes
 * the self-contained sections; the only shared state is `profile` (a few
 * sections read it, two hand back an updated copy) and the unsaved-changes
 * check, which it delegates to the sections that own editable forms.
 */
@Component({
  selector: 'lib-profile-page',
  imports: [
    MatProgressBarModule,
    PageHeader,
    ProfileIdentitySection,
    ProfilePasswordSection,
    ProfileTwoFactorSection,
    ProfileConnectedAccountsSection,
    ProfileSessionsSection,
    ProfileDangerZoneSection,
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
        <lib-profile-identity-section
          [profile]="p"
          (profileChanged)="profile.set($event)"
        />
        <lib-profile-password-section />
        <lib-profile-two-factor-section [profile]="p" (changed)="loadProfile()" />
        <lib-profile-connected-accounts-section />
        <lib-profile-sessions-section />
        <lib-profile-danger-zone-section />
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
    lib-profile-identity-section {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
    }
    .profile__roles {
      font: 500 0.6875rem/1 var(--app-font-mono);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--app-color-on-surface) 55%, transparent);
    }
    .profile__error {
      color: var(--app-color-error);
      font-size: 0.8125rem;
      margin: 0;
    }
  `,
})
export class ProfilePage implements HasUnsavedChanges {
  private readonly service = inject(ProfileService);

  protected readonly profile = signal<UserProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly roleLabel = computed(() =>
    (this.profile()?.roles ?? []).join(', '),
  );

  private readonly identity = viewChild(ProfileIdentitySection);
  private readonly password = viewChild(ProfilePasswordSection);
  private readonly dangerZone = viewChild(ProfileDangerZoneSection);

  constructor() {
    this.loadProfile();
  }

  /** For `unsavedChangesGuard` — any section with an edited, unsaved form. */
  hasUnsavedChanges(): boolean {
    return (
      this.identity()?.hasUnsavedChanges() === true ||
      this.password()?.hasUnsavedChanges() === true ||
      this.dangerZone()?.hasUnsavedChanges() === true
    );
  }

  protected loadProfile(): void {
    this.service.getProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load your profile.');
        this.loading.set(false);
      },
    });
  }
}
