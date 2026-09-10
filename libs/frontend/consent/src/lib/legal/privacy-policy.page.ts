import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { PublicSettingsService, RETENTION_FALLBACK } from '@org/frontend-core';

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
      <p><em>Last updated: 09/09/2026</em></p>

      <h2>Controller</h2>
      <p>
        <strong>Quentin CHAUMONT EI</strong>, 40 rue Monsarrat, 33800 Bordeaux,
        France. Data protection contact: chaumont.quentin@gmail.com.
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
          <strong>Optional analytics</strong> — only with your consent (see the
          cookie policy).
        </li>
      </ul>

      <h2>Retention</h2>
      <ul>
        <li>
          <strong>Account data</strong> — for the life of the account, then
          deleted or anonymised on closure. Inactive accounts are
          {{ accountRetentionText() }}.
        </li>
        <li><strong>Technical logs</strong> — [12] months.</li>
        <li>
          <strong>Consent records</strong> (cookies) — 6 months, then we ask
          again.
        </li>
      </ul>

      <h2>Account retention</h2>
      @if (retention().accountRetention.inactiveDays; as days) {
        <p>
          Inactive accounts are permanently deleted after
          <strong>{{ days }} days</strong> of inactivity.
          @if (retention().accountRetention.warningDays; as warn) {
            We email you <strong>{{ warn }} days</strong> beforehand so you can
            keep the account by signing in.
          }
        </p>
      } @else {
        <p>
          We keep your account for as long as it exists. We
          <strong>do not automatically delete inactive accounts</strong>. You can
          delete your account at any time from your profile.
        </p>
      }

      <h2>Your rights</h2>
      <p>
        Access, rectification, erasure, restriction, portability, objection, and
        the right to lodge a complaint with the French data protection authority
        (<a href="https://www.cnil.fr" target="_blank" rel="noopener">CNIL</a>).
        Exercise them at chaumont.quentin@gmail.com.
      </p>

      <h2>International transfers</h2>
      <p>
        [State whether data leaves the EU/EEA and, if so, the safeguards used —
        or "We do not transfer personal data outside the EU/EEA."]
      </p>

      <h2>Automated decision-making</h2>
      <p>We do not carry out automated decision-making or profiling.</p>

      <h2>Sub-processors</h2>
      <p>
        We rely on the following categories of providers: hosting ([HOST NAME —
        location]), transactional email ([PROVIDER — location]), and, subject to
        your consent, analytics ([PROVIDER — location]).
      </p>
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
  private readonly settings = inject(PublicSettingsService);

  protected readonly retention = toSignal(this.settings.get(), {
    initialValue: RETENTION_FALLBACK,
  });

  /** One-line retention phrase for the "Retention" list, kept in sync with
   * the "Account retention" section above. */
  protected accountRetentionText(): string {
    const days = this.retention().accountRetention.inactiveDays;
    return days
      ? `permanently deleted after ${days} days of inactivity`
      : 'not automatically deleted';
  }

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
