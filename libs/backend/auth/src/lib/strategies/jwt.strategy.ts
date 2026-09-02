import { Injectable } from '@nestjs/common';
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
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, roles: payload.roles ?? [] };
  }
}
