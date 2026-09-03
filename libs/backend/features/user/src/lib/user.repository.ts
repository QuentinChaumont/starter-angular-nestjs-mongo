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
