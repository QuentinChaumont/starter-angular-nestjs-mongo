import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PublicSettingsService, RETENTION_FALLBACK } from '@org/frontend-core';
import { LegalPageShell } from './legal-page-shell';

/**
 * TEMPLATE — replace the bracketed placeholders with this project's real
 * privacy notice before going live. The generator never overwrites this
 * file once it exists.
 */
@Component({
  selector: 'lib-privacy-policy',
  imports: [LegalPageShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-legal-page-shell heading="Privacy Notice">
      <p class="legal__meta"><em>Last updated: 09/09/2026</em></p>

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
    </lib-legal-page-shell>
  `,
  styles: `
    .legal__meta {
      margin: 0 0 var(--app-space-4);
      font-size: 0.8125rem;
      color: color-mix(in srgb, var(--app-color-on-surface) 55%, transparent);
    }
    h2 {
      margin: var(--app-space-6) 0 var(--app-space-2);
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: -0.005em;
    }
    h2:first-of-type {
      margin-block-start: var(--app-space-4);
    }
    p,
    li {
      margin: 0 0 var(--app-space-2);
      font-size: 0.9375rem;
      line-height: 1.6;
      color: color-mix(in srgb, var(--app-color-on-surface) 88%, transparent);
    }
    ul {
      margin: 0 0 var(--app-space-2);
      padding-inline-start: 1.25em;
    }
    a {
      color: var(--app-color-primary);
    }
    strong {
      color: var(--app-color-on-surface);
      font-weight: 600;
    }
  `,
})
export class PrivacyPolicy {
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
}
