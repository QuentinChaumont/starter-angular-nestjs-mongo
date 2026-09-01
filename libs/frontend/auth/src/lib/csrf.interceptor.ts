import { HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { readCookie } from './read-cookie';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'X-CSRF-Token';
const NEEDS_CSRF = /\/auth\/(refresh|logout)(\?|$)/;

/**
 * Double-submit CSRF: copy the non-httpOnly `csrf-token` cookie into the
 * `X-CSRF-Token` header on the cookie-authenticated routes
 * (`/auth/refresh`, `/auth/logout`). Everything else passes through.
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!NEEDS_CSRF.test(req.url)) {
    return next(req);
  }
  const token = readCookie(inject(DOCUMENT).cookie, CSRF_COOKIE);
  const cloned = token
    ? req.clone({
        withCredentials: true,
        headers: req.headers.set(CSRF_HEADER, token),
      })
    : req.clone({ withCredentials: true });
  return next(cloned);
};
