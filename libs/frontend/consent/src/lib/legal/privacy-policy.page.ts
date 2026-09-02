import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

/**
 * TEMPLATE — replace the bracketed placeholders with this project's real
 * privacy notice before going live. The generator never overwrites this
 * file once it exists.
 */
@Component({
  selector: 'lib-privacy-policy',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="legal">
      <button mat-button class="legal__back" (click)="back()">
        <mat-icon>arrow_back</mat-icon> Back
      </button>
      <h1>Privacy Notice</h1>
      <p><em>Last updated: [DATE]</em></p>

      <h2>Controller</h2>
      <p>
        <strong>[COMPANY NAME]</strong>, [ADDRESS]. Data protection contact:
        [DPO / PRIVACY CONTACT EMAIL].
      </p>

      <h2>What we process and why</h2>
      <ul>
        <li>
          <strong>Account data</strong> (email, name, roles) — to provide the
          service. Legal basis: performance of a contract.
        </li>
        <li>
          <strong>Technical logs</strong> (IP, user agent, request IDs) — for
          security and troubleshooting. Legal basis: legitimate interest.
        </li>
        <li>
          <strong>Optional analytics</strong> — only with your consent
          (see the cookie policy).
        </li>
      </ul>

      <h2>Retention</h2>
      <p>[Describe retention periods per data category.]</p>

      <h2>Your rights</h2>
      <p>
        Access, rectification, erasure, restriction, portability, objection,
        and the right to lodge a complaint with [SUPERVISORY AUTHORITY].
        Exercise them at [PRIVACY CONTACT EMAIL].
      </p>

      <h2>Sub-processors</h2>
      <p>[List hosting / email / analytics providers and their locations.]</p>
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
  `,
})
export class PrivacyPolicy {
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
