import { ValidationError } from '@org/backend-core';
import { generateOpaqueToken, hashToken } from '@org/backend-auth';
import type { SingleUseTokenRepository } from './single-use-token.repository';

/** What a single-use token authorises — the two flows share one collection. */
export type SingleUseTokenPurpose = 'reset-password' | 'verify-email';

/**
 * Fields common to every single-use token (password reset, email
 * verification). The raw token is never stored — only its SHA-256, exactly
 * like refresh tokens. Mongo's TTL index on `expiresAt` sweeps stale rows.
 */
export interface SingleUseTokenFields {
  userId: string;
  purpose: SingleUseTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
}

/**
 * Shared issue / consume logic. `issue` returns the raw token exactly once
 * (to be emailed); `consume` validates and burns it, returning the owner's
 * id. An invalid, expired, already-used or wrong-purpose token is an
 * indistinguishable `400` — the caller never learns which.
 */
export abstract class SingleUseTokenService {
  protected abstract readonly repository: SingleUseTokenRepository;
  protected abstract ttlMs(): number;
  protected abstract purpose(): SingleUseTokenPurpose;

  async issue(userId: string): Promise<string> {
    const token = generateOpaqueToken();
    await this.repository.create({
      userId,
      purpose: this.purpose(),
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + this.ttlMs()),
    });
    return token;
  }

  async consume(rawToken: string): Promise<string> {
    const row = await this.repository.findByHash(hashToken(rawToken));
    if (
      !row ||
      row.purpose !== this.purpose() ||
      row.consumedAt ||
      row.expiresAt.getTime() <= Date.now()
    ) {
      throw new ValidationError(
        'INVALID_TOKEN',
        'This link is invalid or has expired. Please request a new one.',
      );
    }
    await this.repository.consumeById(row.id);
    return row.userId;
  }

  invalidateAllForUser(userId: string): Promise<void> {
    return this.repository.consumeAllForUser(userId, this.purpose());
  }

  /** When the last token for this user + purpose was issued (resend cooldowns). */
  latestIssuedAt(userId: string): Promise<Date | null> {
    return this.repository.latestIssuedAt(userId, this.purpose());
  }
}
