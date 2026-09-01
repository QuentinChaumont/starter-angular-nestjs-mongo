import { Injectable } from '@nestjs/common';
import { AppConfigService, UnauthorizedError } from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { AuthenticatedUser } from '../models/authenticated-user';
import { generateOpaqueToken } from '../refresh/opaque-token';
import { OidcClaims, extractRoles } from './oidc-claims';
import { resolveOidcConfig } from './resolve-oidc-config';

function splitName(name: string | undefined): [string, string] {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return ['OIDC', 'User'];
  }
  if (parts.length === 1) {
    return [parts[0], parts[0]];
  }
  return [parts[0], parts.slice(1).join(' ')];
}

/**
 * Maps a verified OIDC identity onto a local `user`. Linking is by
 * **verified email**: an existing account with the same email is reused
 * (account linking), otherwise a passwordless account is created. The
 * provider is trusted only for a `email_verified` address — unless
 * `OIDC_REQUIRE_VERIFIED_EMAIL=false` relaxes that.
 */
@Injectable()
export class OidcUserLinker {
  constructor(
    private readonly users: UserService,
    private readonly config: AppConfigService,
  ) {}

  async linkFromClaims(claims: OidcClaims): Promise<AuthenticatedUser> {
    const cfg = resolveOidcConfig(this.config);
    if (!cfg) {
      throw new UnauthorizedError(
        'OIDC_NOT_CONFIGURED',
        'OIDC login is not enabled',
      );
    }

    if (!claims.email) {
      throw new UnauthorizedError(
        'OIDC_EMAIL_MISSING',
        'The identity provider did not return an email address',
      );
    }
    if (cfg.requireVerifiedEmail && !claims.emailVerified) {
      throw new UnauthorizedError(
        'OIDC_EMAIL_NOT_VERIFIED',
        'The identity provider has not verified this email address',
      );
    }

    const email = claims.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) {
      return { id: existing._id.toString(), roles: existing.roles };
    }

    const [firstName, lastName] = claims.givenName
      ? [claims.givenName, claims.familyName ?? claims.givenName]
      : splitName(claims.name);

    const created = await this.users.create({
      email,
      // Random, never disclosed: the account authenticates via OIDC, not a
      // local password.
      password: generateOpaqueToken(),
      firstName,
      lastName,
      roles: extractRoles(claims.raw, cfg.rolesClaim),
    });

    return { id: created._id.toString(), roles: created.roles };
  }
}
