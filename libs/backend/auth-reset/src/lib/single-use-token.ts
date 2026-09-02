import { BaseRepository } from '@org/backend-database-mongo';
import { ValidationError } from '@org/backend-core';
import { QueryFilter, UpdateQuery } from 'mongoose';
import { generateOpaqueToken, hashToken } from '@org/backend-auth';

/**
 * Fields common to every single-use token collection (password reset, email
 * verification). The raw token is never stored — only its SHA-256, exactly
 * like refresh tokens. Mongo's TTL index on `expiresAt` sweeps stale rows.
 */
export interface SingleUseTokenFields {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
}

/**
 * Shared persistence for single-use token schemas. A concrete subclass just
 * wires the injected model in its constructor.
 */
export abstract class SingleUseTokenRepository<
  T extends SingleUseTokenFields,
> extends BaseRepository<T> {
  findByHash(tokenHash: string) {
    return this.findOne({ tokenHash } as QueryFilter<T>);
  }

  /** Issue time of the most recent token for a user (consumed or not), or
   * `null` if they never had one. Relies on the schema's `timestamps`. */
  async latestIssuedAt(userId: string): Promise<Date | null> {
    const row = await this.model
      .findOne({ userId } as QueryFilter<T>)
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean<{ createdAt?: Date } | null>()
      .exec();
    return row?.createdAt ?? null;
  }

  async consumeById(id: string): Promise<void> {
    await this.updateById(id, {
      consumedAt: new Date(),
    } as UpdateQuery<T>);
  }

  async consumeAllForUser(userId: string): Promise<void> {
    await this.model
      .updateMany(
        { userId, consumedAt: { $exists: false } } as QueryFilter<T>,
        { consumedAt: new Date() } as UpdateQuery<T>,
      )
      .exec();
  }
}

/**
 * Shared issue / consume logic. `issue` returns the raw token exactly once
 * (to be emailed); `consume` validates and burns it, returning the owner's
 * id. An invalid, expired or already-used token is an indistinguishable
 * `400` — the caller never learns which.
 */
export abstract class SingleUseTokenService<T extends SingleUseTokenFields> {
  protected abstract readonly repository: SingleUseTokenRepository<T>;
  protected abstract ttlMs(): number;

  async issue(userId: string): Promise<string> {
    const token = generateOpaqueToken();
    await this.repository.create({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + this.ttlMs()),
    } as Partial<T>);
    return token;
  }

  async consume(rawToken: string): Promise<string> {
    const row = await this.repository.findByHash(hashToken(rawToken));
    if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new ValidationError(
        'INVALID_TOKEN',
        'This link is invalid or has expired. Please request a new one.',
      );
    }
    await this.repository.consumeById(row.id);
    return row.userId;
  }

  invalidateAllForUser(userId: string): Promise<void> {
    return this.repository.consumeAllForUser(userId);
  }

  /** When the last token for this user was issued (for resend cooldowns). */
  latestIssuedAt(userId: string): Promise<Date | null> {
    return this.repository.latestIssuedAt(userId);
  }
}
