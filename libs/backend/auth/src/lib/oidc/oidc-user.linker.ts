import { Injectable } from '@nestjs/common';
import {
  AppConfigService,
  AuthenticatedUser,
  UnauthorizedError,
} from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { generateOpaqueToken } from '../refresh/opaque-token';
import { OidcClaims, extractRoles } from './oidc-claims';
import { resolveOidcProvider } from './resolve-oidc-config';

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
 * `requireVerifiedEmail` is relaxed for that provider.
 *
 * The `identities` collection (V2.2 step 42) will replace the email lookup
 * with an explicit `(provider, subject)` link — untouched here.
 */
@Injectable()
export class OidcUserLinker {
  constructor(
    private readonly users: UserService,
    private readonly config: AppConfigService,
  ) {}

  async linkFromClaims(
    providerId: string,
    claims: OidcClaims,
  ): Promise<AuthenticatedUser> {
    const provider = resolveOidcProvider(this.config, providerId);
    if (!provider) {
      throw new UnauthorizedError(
        'OIDC_PROVIDER_UNKNOWN',
        `No active OIDC provider "${providerId}"`,
      );
    }

    if (!claims.email) {
      throw new UnauthorizedError(
        'OIDC_EMAIL_MISSING',
        'The identity provider did not return an email address',
      );
    }
    if (provider.requireVerifiedEmail && !claims.emailVerified) {
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
      roles: extractRoles(claims.raw, provider.rolesClaim),
    });

    return { id: created._id.toString(), roles: created.roles };
  }
}
