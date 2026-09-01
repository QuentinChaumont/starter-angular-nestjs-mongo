import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AuthStore } from '@org/frontend-auth';

/**
 * Placeholder landing page for `/app`. Replace it with the project's real
 * home — it only exists so the shell has something to render out of the box.
 */
@Component({
  selector: 'lib-dashboard-home',
  imports: [MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>You're signed in</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Roles: {{ roles() || 'none' }}</p>
        <p>
          This is the starter's placeholder home. Wire your own routes under
          <code>/app</code> and menu entries in <code>DASHBOARD_NAV</code>.
        </p>
      </mat-card-content>
    </mat-card>
  `,
})
export class DashboardHome {
  private readonly store = inject(AuthStore);

  protected roles(): string {
    return this.store.user()?.roles.join(', ') ?? '';
  }
}
