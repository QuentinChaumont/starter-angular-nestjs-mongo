import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AppConfigService, AuthenticatedUser } from '@org/backend-core';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../models/jwt-payload';
import { resolveJwtConfig } from '../resolve-jwt-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfigService) {
    const { secret } = resolveJwtConfig(config);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Whatever this returns becomes `request.user` — Passport-specific
   * details stop here; the rest of the app only ever sees an
   * `AuthenticatedUser`.
   *
   * A `pending_2fa` token (V2.2 step 43) is **not** a session token: it is
   * rejected here so it can't reach any `@UseGuards(JwtAuthGuard)` route.
   * `POST /auth/2fa/verify` validates it directly instead.
   */
  validate(payload: JwtPayload & { twoFactorPending?: boolean }): AuthenticatedUser {
    if (payload.twoFactorPending) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, roles: payload.roles ?? [] };
  }
}
