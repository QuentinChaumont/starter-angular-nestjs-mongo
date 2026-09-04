import { Route } from '@angular/router';

/**
 * The `/legal/*` pages, each lazily loaded into its own chunk. Exported
 * instead of the page components so that importing `ConsentService` /
 * `ConsentBanner` eagerly doesn't pull the pages (and their `MatCard`
 * etc.) into the initial bundle.
 *
 * Wire under `/legal`: `{ path: 'legal', children: LEGAL_ROUTES }`.
 */
export const LEGAL_ROUTES: Route[] = [
  {
    path: 'cookies',
    loadComponent: () =>
      import('./cookie-policy.page').then((m) => m.CookiePolicy),
    title: 'Cookie policy',
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./privacy-policy.page').then((m) => m.PrivacyPolicy),
    title: 'Privacy notice',
  },
  {
    path: 'notice',
    loadComponent: () =>
      import('./legal-notice.page').then((m) => m.LegalNotice),
    title: 'Legal notice',
  },
];
