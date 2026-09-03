import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseRepository } from '@org/backend-database-mongo';
import { Model } from 'mongoose';
import { Identity, IdentityDocument } from './identity.schema';

@Injectable()
export class IdentityRepository extends BaseRepository<Identity> {
  constructor(@InjectModel(Identity.name) model: Model<Identity>) {
    super(model);
  }

  findByProviderSubject(
    provider: string,
    subject: string,
  ): Promise<IdentityDocument | null> {
    return this.model.findOne({ provider, subject }).exec();
  }

  findForUser(userId: string): Promise<IdentityDocument[]> {
    return this.model.find({ userId }).sort({ linkedAt: 1 }).exec();
  }

  countForUser(userId: string): Promise<number> {
    return this.model.countDocuments({ userId }).exec();
  }

  async deleteForUserProvider(
    userId: string,
    provider: string,
  ): Promise<boolean> {
    const deleted = await this.model
      .findOneAndDelete({ userId, provider })
      .exec();
    return deleted !== null;
  }
}
