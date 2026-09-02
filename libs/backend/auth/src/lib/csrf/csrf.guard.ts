import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UnauthorizedError } from '@org/backend-core';
import type { Request } from 'express';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '../cookies/cookie.constants';
import { parseCookies } from '../cookies/parse-cookies';
import { timingSafeEqualString } from './timing-safe-equal';

/**
 * Double-submit CSRF check for the cookie-authenticated routes
 * (`/auth/refresh`, `/auth/logout`): the request must carry the same token
 * both in the non-httpOnly `csrf-token` cookie and in the `X-CSRF-Token`
 * header. A cross-site page can send the cookie but cannot read it to set
 * the header.
 *
 * A missing / mismatched token is a `401` (not `403`): the request hasn't
 * proven it's a legitimate same-origin caller, and the SPA's bootstrap
 * silent-refresh — which has no session yet — should treat it as "not
 * signed in", not surface an error toast.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const cookieToken = parseCookies(request.headers.cookie)[CSRF_COOKIE_NAME];
    const headerValue = request.headers[CSRF_HEADER_NAME];
    const headerToken = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (
      !cookieToken ||
      !headerToken ||
      !timingSafeEqualString(cookieToken, headerToken)
    ) {
      throw new UnauthorizedError(
        'CSRF_TOKEN_INVALID',
        'Missing or invalid CSRF token',
      );
    }

    return true;
  }
}
