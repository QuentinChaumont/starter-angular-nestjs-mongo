import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shared chrome for every unauthenticated auth page (login, register,
 * forgot/reset password, verify email, the 2FA prompt): the brand mark
 * above a `.panel`-styled card, centered on the page. Replaces six copies
 * of the same floating-form layout with one place to keep it consistent.
 */
@Component({
  selector: 'lib-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-shell" [style.--auth-shell-width]="width()">
      <div class="auth-shell__brand">
        <span class="auth-shell__mark" aria-hidden="true">◆</span>
        <span class="auth-shell__name">Starter</span>
      </div>
      <section class="auth-shell__panel">
        <ng-content />
      </section>
    </div>
  `,
  styles: `
    .auth-shell {
      max-width: var(--auth-shell-width, 360px);
      margin: 10vh auto var(--app-space-6);
      padding: 0 var(--app-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--app-space-5);
    }
    .auth-shell__brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--app-space-2);
    }
    .auth-shell__mark {
      font-size: 0.875rem;
      color: var(--app-color-primary);
    }
    .auth-shell__name {
      font: 600 0.9375rem/1 var(--app-font-family);
      letter-spacing: -0.01em;
      color: var(--app-color-on-surface);
    }
    .auth-shell__panel {
      background: var(--app-color-surface);
      border: var(--app-border-hairline);
      border-radius: var(--app-radius-lg);
      padding: var(--app-space-6) var(--app-space-5);
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
    }
  `,
})
export class AuthShell {
  /** CSS width value for the card — 420px for the wider register form. */
  readonly width = input('360px');
}
