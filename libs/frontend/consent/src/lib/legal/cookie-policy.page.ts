import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalPageShell } from './legal-page-shell';

/**
 * TEMPLATE — replace the bracketed placeholders with this project's real
 * cookie policy before going live. The generator never overwrites this
 * file once it exists.
 */
@Component({
  selector: 'lib-cookie-policy',
  imports: [LegalPageShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-legal-page-shell heading="Cookie Policy">
      <p class="legal__meta"><em>Last updated: 09/09/2026</em></p>

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
    p {
      margin: 0 0 var(--app-space-2);
      font-size: 0.9375rem;
      line-height: 1.6;
      color: color-mix(in srgb, var(--app-color-on-surface) 88%, transparent);
    }
    strong {
      color: var(--app-color-on-surface);
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: var(--app-space-2) 0 var(--app-space-4);
      font-size: 0.875rem;
    }
    th,
    td {
      border: var(--app-border-hairline);
      padding: var(--app-space-2) var(--app-space-3);
      text-align: start;
    }
    th {
      font-weight: 600;
      background: var(--app-color-surface-variant);
    }
  `,
})
export class CookiePolicy {}
