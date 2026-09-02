import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthStore } from '@org/frontend-auth';

/**
 * Placeholder landing page for `/app`. Replace it with the project's real
 * home — it only exists so the shell has something to render out of the box.
 * Styled as a compact session panel to match the console aesthetic.
 */
@Component({
  selector: 'lib-dashboard-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="home" data-testid="dashboard-home">
      <header class="home__toolbar">
        <h1 class="home__title">Home</h1>
      </header>

      <section class="panel">
        <div class="panel__head">
          <h2 class="panel__title">Session</h2>
          <span class="panel__tag">signed in</span>
        </div>
        <dl class="facts">
          <div class="facts__row">
            <dt>Account</dt>
            <dd class="mono">{{ account() }}</dd>
          </div>
          <div class="facts__row">
            <dt>Roles</dt>
            <dd class="mono">{{ roles() || '—' }}</dd>
          </div>
          @if (verification(); as v) {
            <div class="facts__row">
              <dt>Email</dt>
              <dd class="mono">{{ v }}</dd>
            </div>
          }
        </dl>
      </section>

      <p class="home__note">
        This is the starter's placeholder home. Wire your own routes under
        <code>/app</code> and menu entries in <code>DASHBOARD_NAV</code>.
      </p>
    </div>
  `,
  styles: `
    .home {
      display: flex;
      flex-direction: column;
      gap: var(--app-space-4);
      max-width: 720px;
    }
    .home__toolbar {
      display: flex;
      align-items: center;
      min-block-size: 28px;
      padding-block-end: var(--app-space-3);
      border-block-end: var(--app-border-hairline);
    }
    .home__title {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .panel {
      background: var(--app-color-surface);
      border: var(--app-border-hairline);
      border-radius: var(--app-radius-md);
    }
    .panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--app-space-3) var(--app-space-4);
      border-block-end: var(--app-border-hairline);
    }
    .panel__title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .panel__tag {
      font: 500 0.6875rem/1 var(--app-font-mono);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--app-color-on-surface) 55%, transparent);
      border: var(--app-border-hairline);
      border-radius: var(--app-radius-sm);
      padding: 3px 6px;
    }
    .facts {
      margin: 0;
    }
    .facts__row {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: var(--app-space-4);
      padding: 9px var(--app-space-4);
      font-size: 0.8125rem;
    }
    .facts__row + .facts__row {
      border-block-start: var(--app-border-hairline);
    }
    .facts dt {
      color: color-mix(in srgb, var(--app-color-on-surface) 58%, transparent);
    }
    .facts dd {
      margin: 0;
    }
    .mono {
      font-family: var(--app-font-mono);
      font-size: 0.75rem;
    }
    .home__note {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.5;
      color: color-mix(in srgb, var(--app-color-on-surface) 60%, transparent);
    }
    .home__note code {
      font-family: var(--app-font-mono);
      font-size: 0.75rem;
      padding: 1px 4px;
      border-radius: var(--app-radius-sm);
      background: var(--app-color-surface-variant);
    }
  `,
})
export class DashboardHome {
  private readonly store = inject(AuthStore);

  protected account(): string {
    const user = this.store.user();
    return user?.email ?? user?.id ?? 'unknown';
  }

  protected roles(): string {
    return this.store.user()?.roles.join(', ') ?? '';
  }

  protected verification(): string | null {
    const value = this.store.user()?.emailVerifiedAt;
    if (value === undefined) return null;
    return value ? 'verified' : 'not verified';
  }
}
