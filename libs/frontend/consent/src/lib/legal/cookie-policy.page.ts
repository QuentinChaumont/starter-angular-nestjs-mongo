import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

/**
 * TEMPLATE — replace the bracketed placeholders with this project's real
 * cookie policy before going live. The generator never overwrites this
 * file once it exists.
 */
@Component({
  selector: 'lib-cookie-policy',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="legal">
      <button mat-button class="legal__back" (click)="back()">
        <mat-icon>arrow_back</mat-icon> Back
      </button>
      <h1>Cookie Policy</h1>
      <p><em>Last updated: 09/09/2026</em></p>

      <h2>Who we are</h2>
      <p>
        This site is operated by <strong>Quentin CHAUMONT EI</strong>,
        registered at 40 rue Monsarrat, 33800 Bordeaux, France. Data protection
        contact: chaumont.quentin@gmail.com
      </p>

      <h2>What cookies we use</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Purpose</th>
            <th>Retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Strictly necessary</td>
            <td>Session, security (CSRF), load balancing.</td>
            <td>Session / up to 12 months</td>
          </tr>
          <tr>
            <td>Analytics (optional)</td>
            <td>[TOOL NAME] — anonymous usage statistics.</td>
            <td>13 months max</td>
          </tr>
        </tbody>
      </table>

      <h2>Your choices</h2>
      <p>
        Strictly necessary cookies cannot be refused. For every other category
        you decide via the consent banner shown on your first visit, and can
        change your mind at any time from
        <strong>Manage cookies</strong> in the account menu. Your choice is
        stored for 6 months, after which we ask again.
      </p>

      <h2>Contact</h2>
      <p>Questions: chaumont.quentin@gmail.com</p>
    </mat-card>
  `,
  styles: `
    .legal {
      max-width: 760px;
      margin: 32px auto;
      padding: 32px;
    }
    .legal__back {
      margin-bottom: 8px;
    }
    .legal table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    .legal th,
    .legal td {
      border: 1px solid var(--app-color-outline);
      padding: 8px;
      text-align: start;
    }
  `,
})
export class CookiePolicy {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  /** Go back if we got here from within the app; otherwise (direct link /
   * new tab, where `history.length` is 1) head to the app root. */
  protected back(): void {
    if (history.length > 1) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }
}
