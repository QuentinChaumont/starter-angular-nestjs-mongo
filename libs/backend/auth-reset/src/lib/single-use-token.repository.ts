import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@org/backend-database-mongo';
import { SingleUseTokenPurpose } from './single-use-token';
import { SingleUseToken } from './single-use-token.schema';

/** Persistence for the shared `single_use_tokens` collection. */
@Injectable()
export class SingleUseTokenRepository extends BaseRepository<SingleUseToken> {
  constructor(
    @InjectModel(SingleUseToken.name) model: Model<SingleUseToken>,
  ) {
    super(model);
  }

  findByHash(tokenHash: string) {
    return this.findOne({ tokenHash });
  }

  /** Issue time of the most recent token for a user + purpose (consumed or
   * not), or `null` if they never had one. */
  async latestIssuedAt(
    userId: string,
    purpose: SingleUseTokenPurpose,
  ): Promise<Date | null> {
    const row = await this.model
      .findOne({ userId, purpose })
      .sort({ createdAt: -1 })
      .select('createdAt')
      .lean<{ createdAt?: Date } | null>()
      .exec();
    return row?.createdAt ?? null;
  }

  async consumeById(id: string): Promise<void> {
    await this.updateById(id, { consumedAt: new Date() });
  }

  async consumeAllForUser(
    userId: string,
    purpose: SingleUseTokenPurpose,
  ): Promise<void> {
    await this.model
      .updateMany(
        { userId, purpose, consumedAt: { $exists: false } },
        { consumedAt: new Date() },
      )
      .exec();
  }
}
