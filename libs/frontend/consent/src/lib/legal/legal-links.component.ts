import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONSENT_CONFIG } from '../consent.config';

/**
 * A slim footer with the mandatory legal links (legal notice, privacy,
 * cookies) — so every page has them one click away, as data-protection law
 * generally requires. Mounted once in `app.ts`, outside the router outlet.
 * Routes are read from `CONSENT_CONFIG.legal` so a project can move them.
 */
@Component({
  selector: 'lib-legal-links',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="legal-links">
      <nav aria-label="Legal">
        <a [routerLink]="config.legal.legalNoticeRoute">Legal notice</a>
        <span aria-hidden="true">·</span>
        <a [routerLink]="config.legal.privacyPolicyRoute">Privacy</a>
        <span aria-hidden="true">·</span>
        <a [routerLink]="config.legal.cookiePolicyRoute">Cookies</a>
      </nav>
      <span class="legal-links__credit">
        Built with ❤️ by
        <a
          href="https://www.linkedin.com/in/quentin-chmt/"
          target="_blank"
          rel="noopener"
          >Quentin Chaumont</a
        >
      </span>
    </footer>
  `,
  styles: `
    .legal-links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 6px 12px;
      padding: 10px 16px;
      font-size: 0.75rem;
      color: color-mix(in srgb, var(--app-color-on-surface) 55%, transparent);
      border-block-start: var(--app-border-hairline, 1px solid #e0e0e0);
    }
    .legal-links nav {
      display: inline-flex;
      gap: 8px;
      align-items: center;
    }
    .legal-links a {
      color: inherit;
      text-decoration: none;
    }
    .legal-links a:hover {
      color: var(--app-color-on-surface);
      text-decoration: underline;
    }
    .legal-links__credit a {
      text-decoration: underline;
    }
  `,
})
export class LegalLinks {
  protected readonly config = inject(CONSENT_CONFIG);
}
