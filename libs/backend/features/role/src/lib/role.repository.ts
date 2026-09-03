import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseRepository } from '@org/backend-database-mongo';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './role.schema';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  constructor(@InjectModel(Role.name) model: Model<Role>) {
    super(model);
  }

  findByName(name: string): Promise<RoleDocument | null> {
    return this.model.findOne({ name }).exec();
  }

  /** Names present in the catalogue, out of the given candidates. */
  async existingNames(names: string[]): Promise<string[]> {
    if (names.length === 0) {
      return [];
    }
    const rows = await this.model
      .find({ name: { $in: names } })
      .select('name')
      .exec();
    return rows.map((r) => r.name);
  }
}
