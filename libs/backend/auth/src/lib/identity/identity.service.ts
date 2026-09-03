import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '@org/backend-core';
import { AuthEvents } from '../auth-events';
import { IdentityRepository } from './identity.repository';
import { IdentityDocument } from './identity.schema';

const MONGO_DUPLICATE_KEY_CODE = 11000;

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === MONGO_DUPLICATE_KEY_CODE
  );
}

export interface IdentityLink {
  userId: string;
  provider: string;
  subject: string;
  email?: string;
}

/**
 * The `identities` collection (V2.2 step 42): the set of OIDC providers a
 * local account can log in with. `OidcUserLinker` resolves logins against
 * it; the profile page's "Connected accounts" section reads and edits it.
 */
@Injectable()
export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly events: AuthEvents,
  ) {}

  /** The identity for this `(provider, subject)`, or `null`. */
  find(provider: string, subject: string): Promise<IdentityDocument | null> {
    return this.repository.findByProviderSubject(provider, subject);
  }

  listForUser(userId: string): Promise<IdentityDocument[]> {
    return this.repository.findForUser(userId);
  }

  countForUser(userId: string): Promise<number> {
    return this.repository.countForUser(userId);
  }

  /**
   * Links a provider identity to a user. Idempotent when the same
   * `(provider, subject)` is already linked to that same user; a `409`
   * `IDENTITY_ALREADY_LINKED` when it belongs to a **different** account
   * (no account takeover).
   */
  async link(input: IdentityLink): Promise<IdentityDocument> {
    const existing = await this.repository.findByProviderSubject(
      input.provider,
      input.subject,
    );
    if (existing) {
      if (existing.userId !== input.userId) {
        throw new ConflictError(
          'IDENTITY_ALREADY_LINKED',
          'This account is already linked to another user',
        );
      }
      return existing;
    }

    try {
      const created = await this.repository.create({
        userId: input.userId,
        provider: input.provider,
        subject: input.subject,
        email: input.email,
      });
      this.events.emitIdentityLinked({
        userId: input.userId,
        provider: input.provider,
      });
      return created;
    } catch (error) {
      // Lost a race against a concurrent link of the same identity.
      if (isDuplicateKeyError(error)) {
        throw new ConflictError(
          'IDENTITY_ALREADY_LINKED',
          'This account is already linked to another user',
        );
      }
      throw error;
    }
  }

  /**
   * Unlinks a provider from a user. Refuses (`409` `LAST_LOGIN_METHOD`)
   * when it is the account's only remaining way to sign in — no local
   * password and no other identity — which would lock the user out.
   */
  async unlink(
    userId: string,
    provider: string,
    options: { hasPassword: boolean },
  ): Promise<void> {
    const linked = await this.repository.findForUser(userId);
    if (!linked.some((i) => i.provider === provider)) {
      throw new NotFoundError(
        'IDENTITY_NOT_FOUND',
        `No "${provider}" account is linked`,
      );
    }
    if (!options.hasPassword && linked.length <= 1) {
      throw new ConflictError(
        'LAST_LOGIN_METHOD',
        'Set a password before removing your last connected account',
      );
    }
    await this.repository.deleteForUserProvider(userId, provider);
    this.events.emitIdentityUnlinked({ userId, provider });
  }
}
