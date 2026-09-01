/** httpOnly — carries the refresh token, sent only to `/api/auth/*`. */
export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Non-httpOnly — the SPA reads it and echoes it back as a header. */
export const CSRF_COOKIE_NAME = 'csrf-token';

/** Request header the SPA must set on refresh/logout (double-submit). */
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Both cookies are scoped to the auth routes only, so they're never
 * attached to ordinary API calls. Matches the global prefix (`api`) +
 * controller path (`auth`).
 */
export const AUTH_COOKIE_PATH = '/api/auth';

/** httpOnly — holds the in-flight OIDC login state between the two redirects. */
export const OIDC_TX_COOKIE_NAME = 'oidc_tx';

export const OIDC_COOKIE_PATH = '/api/auth/oidc';

/** The OIDC round trip is short — 10 minutes is plenty. */
export const OIDC_TX_MAX_AGE_MS = 10 * 60 * 1000;
