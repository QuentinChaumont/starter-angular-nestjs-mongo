import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

/**
 * TEMPLATE — the site's legal notice / imprint ("mentions légales" under
 * French law, "Impressum" under German law, etc.). Replace the bracketed
 * placeholders with this project's real details before going live. The
 * generator never overwrites this file once it exists.
 */
@Component({
  selector: 'lib-legal-notice',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="legal">
      <button mat-button class="legal__back" (click)="back()">
        <mat-icon>arrow_back</mat-icon> Back
      </button>
      <h1>Legal Notice</h1>
      <p><em>Last updated: 09/09/2026</em></p>

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
export class LegalNotice {
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
