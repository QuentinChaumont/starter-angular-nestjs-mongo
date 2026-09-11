import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseRepository } from '@org/backend-database-mongo';
import { Model, isValidObjectId } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(@InjectModel(User.name) model: Model<User>) {
    super(model);
  }

  /**
   * `password` is `select: false` on the schema, so callers that actually
   * need to verify a credential (only auth's login flow) must opt in
   * explicitly rather than every other query getting it for free.
   */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email }).select('+password').exec();
  }

  /** Same opt-in as `findByEmailWithPassword`, keyed by id — for verifying
   * the current password on `change-password`. */
  async findByIdWithPassword(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    return this.model.findById(id).select('+password').exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email }).exec();
  }

  /** Records activity in a single write: refresh the timestamp, drop any
   * pending retention warning. */
  async stampActivity(id: string, now: Date): Promise<void> {
    await this.model
      .updateOne(
        { _id: id },
        { $set: { lastActiveAt: now }, $unset: { retentionWarnedAt: 1 } },
      )
      .exec();
  }

  /** Accounts eligible for the retention sweep: reference date
   * (`lastActiveAt`, falling back to `createdAt`) at or before `before`,
   * never `admin`, never disabled.
   *
   * `onlyUnwarned` (warn phase) restricts to accounts with no pending
   * warning; when `expiredWarningBefore` is also given, an account warned
   * at or before that instant counts as unwarned too — its prior warning
   * has gone stale (see `account-retention.job.ts`) and it's due a fresh
   * one.
   *
   * `warnedBefore` (delete phase) restricts to accounts warned at or
   * before that instant; when `warnedAfter` is also given, the warning
   * must also be at or after that instant — a warning older than that is
   * stale and no longer authorizes deletion. */
  async findRetentionCandidates(opts: {
    before: Date;
    onlyUnwarned?: boolean;
    expiredWarningBefore?: Date;
    warnedBefore?: Date;
    warnedAfter?: Date;
    limit: number;
  }): Promise<UserDocument[]> {
    const query: Record<string, unknown> = {
      roles: { $ne: 'admin' },
      disabledAt: { $in: [null, undefined] },
      $expr: {
        $lte: [{ $ifNull: ['$lastActiveAt', '$createdAt'] }, opts.before],
      },
    };
    if (opts.onlyUnwarned) {
      if (opts.expiredWarningBefore) {
        query['$or'] = [
          { retentionWarnedAt: { $in: [null, undefined] } },
          { retentionWarnedAt: { $lte: opts.expiredWarningBefore } },
        ];
      } else {
        query['retentionWarnedAt'] = { $in: [null, undefined] };
      }
    }
    if (opts.warnedBefore) {
      query['retentionWarnedAt'] = {
        $ne: null,
        $lte: opts.warnedBefore,
        ...(opts.warnedAfter ? { $gte: opts.warnedAfter } : {}),
      };
    }
    return this.model.find(query).limit(opts.limit).exec();
  }

  async markRetentionWarned(id: string, at: Date): Promise<void> {
    await this.model
      .updateOne({ _id: id }, { $set: { retentionWarnedAt: at } })
      .exec();
  }

  /** Opts into the `select: false` two-factor fields (auth's 2FA flows). */
  async findByIdWithTwoFactor(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) {
      return null;
    }
    return this.model
      .findById(id)
      .select(
        '+twoFactorSecret +twoFactorPendingSecret +twoFactorBackupCodes',
      )
      .exec();
  }
}
