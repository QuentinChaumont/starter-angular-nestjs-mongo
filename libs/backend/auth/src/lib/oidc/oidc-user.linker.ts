import { Injectable } from '@nestjs/common';
import {
  AppConfigService,
  AuthenticatedUser,
  UnauthorizedError,
} from '@org/backend-core';
import { UserService } from '@org/backend-features-user';
import { IdentityService } from '../identity/identity.service';
import { OidcClaims, extractRoles } from './oidc-claims';
import { ResolvedOidcProvider, resolveOidcProvider } from './resolve-oidc-config';

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
 * Maps a verified OIDC identity onto a local `user` (V2.2 step 42).
 *
 * Resolution order:
 * 1. an existing `identities` row for this `(provider, subject)` → that user;
 * 2. otherwise an existing account with the same **verified email** → link a
 *    new identity to it (migrates pre-step-42 accounts on their next login);
 * 3. otherwise create a passwordless account and its first identity.
 *
 * The provider is trusted only for an `email_verified` address — unless
 * `requireVerifiedEmail` is relaxed for that provider.
 */
@Injectable()
export class OidcUserLinker {
  constructor(
    private readonly users: UserService,
    private readonly identities: IdentityService,
    private readonly config: AppConfigService,
  ) {}

  /** Resolve (or provision) the account a fresh OIDC login belongs to. */
  async linkFromClaims(
    providerId: string,
    claims: OidcClaims,
  ): Promise<AuthenticatedUser> {
    const provider = this.requireProvider(providerId);
    const email = this.requireVerifiedEmail(provider, claims);

    const linked = await this.identities.find(providerId, claims.sub);
    if (linked) {
      const user = await this.users.findById(linked.userId).catch(() => null);
      if (user) {
        return { id: user._id.toString(), roles: user.roles };
      }
      // The account behind the identity is gone — fall through and rebuild.
    }

    const existing = await this.users.findByEmail(email);
    if (existing) {
      await this.identities.link({
        userId: existing._id.toString(),
        provider: providerId,
        subject: claims.sub,
        email,
      });
      return { id: existing._id.toString(), roles: existing.roles };
    }

    const [firstName, lastName] = claims.givenName
      ? [claims.givenName, claims.familyName ?? claims.givenName]
      : splitName(claims.name);

    const created = await this.users.create({
      email,
      firstName,
      lastName,
      roles: extractRoles(claims.raw, provider.rolesClaim),
    });
    await this.identities.link({
      userId: created._id.toString(),
      provider: providerId,
      subject: claims.sub,
      email,
    });

    return { id: created._id.toString(), roles: created.roles };
  }

  /**
   * Link a provider to an **already-authenticated** account (the "Connect"
   * button in the profile page). Never opens a session and never creates an
   * account — just records the identity, or `409`s if it's taken.
   */
  async linkToUser(
    providerId: string,
    claims: OidcClaims,
    userId: string,
  ): Promise<void> {
    const provider = this.requireProvider(providerId);
    const email = this.requireVerifiedEmail(provider, claims);

    await this.identities.link({
      userId,
      provider: providerId,
      subject: claims.sub,
      email,
    });
  }

  private requireProvider(providerId: string): ResolvedOidcProvider {
    const provider = resolveOidcProvider(this.config, providerId);
    if (!provider) {
      throw new UnauthorizedError(
        'OIDC_PROVIDER_UNKNOWN',
        `No active OIDC provider "${providerId}"`,
      );
    }
    return provider;
  }

  private requireVerifiedEmail(
    provider: ResolvedOidcProvider,
    claims: OidcClaims,
  ): string {
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
    return claims.email.toLowerCase();
  }
}
