import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseRepository } from '@org/backend-database-mongo';
import { Model } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from './refresh-token.schema';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
  constructor(@InjectModel(RefreshToken.name) model: Model<RefreshToken>) {
    super(model);
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return this.model.findOne({ tokenHash }).exec();
  }

  async markRotated(id: string, replacedByHash: string): Promise<void> {
    await this.model
      .findByIdAndUpdate(id, { revokedAt: new Date(), replacedByHash })
      .exec();
  }

  async revokeById(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { revokedAt: new Date() }).exec();
  }

  async revokeFamily(family: string): Promise<void> {
    await this.model
      .updateMany(
        { family, revokedAt: { $exists: false } },
        { revokedAt: new Date() },
      )
      .exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.model
      .updateMany(
        { userId, revokedAt: { $exists: false } },
        { revokedAt: new Date() },
      )
      .exec();
  }

  /** Like `revokeAllForUser`, but spares the token whose hash is
   * `keepTokenHash` — the caller's current session. */
  async revokeAllForUserExcept(
    userId: string,
    keepTokenHash: string,
  ): Promise<void> {
    await this.model
      .updateMany(
        {
          userId,
          revokedAt: { $exists: false },
          tokenHash: { $ne: keepTokenHash },
        },
        { revokedAt: new Date() },
      )
      .exec();
  }

  async deleteExpiredForUser(userId: string): Promise<void> {
    await this.model
      .deleteMany({ userId, expiresAt: { $lt: new Date() } })
      .exec();
  }
}
