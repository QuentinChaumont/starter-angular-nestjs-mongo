import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LegalPageShell } from './legal-page-shell';

/**
 * TEMPLATE — the site's legal notice / imprint ("mentions légales" under
 * French law, "Impressum" under German law, etc.). Replace the bracketed
 * placeholders with this project's real details before going live. The
 * generator never overwrites this file once it exists.
 */
@Component({
  selector: 'lib-legal-notice',
  imports: [LegalPageShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-legal-page-shell heading="Legal Notice">
      <p class="legal__meta"><em>Last updated: 09/09/2026</em></p>

      <h2>Site publisher</h2>
      <p>
        This site is published by <strong>Quentin CHAUMONT EI</strong>, a sole
        trader ("entreprise individuelle"), registered at 40 rue Monsarrat,
        33800 Bordeaux, France, under SIREN 839&nbsp;387&nbsp;883 (SIRET
        839&nbsp;387&nbsp;883&nbsp;00037), [RCS/RM Bordeaux — confirm register].
        Intra-EU VAT: FR11&nbsp;839&nbsp;387&nbsp;883. Contact:
        chaumont.quentin@gmail.com.
      </p>

      <h2>Publication director</h2>
      <p>Quentin CHAUMONT.</p>

      <h2>Hosting</h2>
      <p>
        The site is hosted by <strong>[HOST NAME]</strong>, [HOST ADDRESS],
        [HOST PHONE / URL].
      </p>

      <h2>Intellectual property</h2>
      <p>
        Unless stated otherwise, all content on this site (text, images, logos,
        code) is the property of Quentin CHAUMONT EI or its partners and is
        protected by intellectual-property law. Any reproduction without prior
        written permission is prohibited.
      </p>

      <h2>Personal data</h2>
      <p>
        How personal data is processed is described in the
        <a href="/legal/privacy">Privacy Notice</a>; cookies are covered by the
        <a href="/legal/cookies">Cookie Policy</a>.
      </p>

      <h2>Credits</h2>
      <p>
        Built on a starter crafted with ❤️ by
        <a
          href="https://www.linkedin.com/in/quentin-chmt/"
          target="_blank"
          rel="noopener"
          >Quentin Chaumont</a
        >.
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
    p {
      margin: 0 0 var(--app-space-2);
      font-size: 0.9375rem;
      line-height: 1.6;
      color: color-mix(in srgb, var(--app-color-on-surface) 88%, transparent);
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
export class LegalNotice {}
