import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService, AuthStore } from '@org/frontend-auth';
import { CONSENT_MANAGER } from '@org/frontend-core';
import { ThemeSettingsPanel } from '@org/frontend-design';

/**
 * Toolbar account button: shows the current roles, opens the theme panel in
 * a dialog, offers "Manage cookies" when the consent brick is installed,
 * and signs out.
 */
@Component({
  selector: 'lib-user-menu',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="menu"
      aria-label="Account menu"
    >
      <mat-icon>account_circle</mat-icon>
    </button>

    <mat-menu #menu="matMenu" class="user-menu__panel">
      <div class="user-menu__header">{{ roleLabel() }}</div>
      <button mat-menu-item (click)="goProfile()">
        <mat-icon>person</mat-icon>
        <span>{{ 'dashboard.profile' | transloco }}</span>
      </button>
      <button mat-menu-item (click)="openTheme()">
        <mat-icon>palette</mat-icon>
        <span>{{ 'dashboard.appearance' | transloco }}</span>
      </button>
      @if (consent) {
        <button mat-menu-item (click)="consent.reopen()">
          <mat-icon>cookie</mat-icon>
          <span>{{ 'dashboard.manageCookies' | transloco }}</span>
        </button>
      }
      <button mat-menu-item (click)="signOut()">
        <mat-icon>logout</mat-icon>
        <span>{{ 'dashboard.signOut' | transloco }}</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .user-menu__header {
      padding: 10px 16px 6px;
      font: 600 0.6875rem/1 var(--app-font-mono);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--app-color-on-surface) 50%, transparent);
    }
  `,
})
export class UserMenu {
  private readonly store = inject(AuthStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  /** Present only when the `frontend-consent` brick is installed. */
  protected readonly consent = inject(CONSENT_MANAGER, { optional: true });

  private readonly transloco = inject(TranslocoService);

  protected roleLabel(): string {
    const roles = this.store.user()?.roles ?? [];
    return roles.length
      ? roles.join(', ')
      : this.transloco.translate('dashboard.signedIn');
  }

  /** Present as a route only when the profile brick (V2.1 step 34) is
   * installed; the menu entry is harmless without it. */
  protected goProfile(): void {
    void this.router.navigate(['/app/profile']);
  }

  protected openTheme(): void {
    this.dialog.open(ThemeSettingsPanel, { width: '320px' });
  }

  protected signOut(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
