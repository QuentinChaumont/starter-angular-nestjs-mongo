import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AppSettingsDocument,
  AppSettingsEntity,
  SINGLETON_ID,
} from './app-settings.schema';

@Injectable()
export class AppSettingsRepository {
  constructor(
    @InjectModel(AppSettingsEntity.name)
    private readonly model: Model<AppSettingsEntity>,
  ) {}

  loadSingleton(): Promise<AppSettingsDocument | null> {
    return this.model.findById(SINGLETON_ID).exec();
  }

  upsertSingleton(set: Record<string, unknown>): Promise<AppSettingsDocument> {
    return this.model
      .findByIdAndUpdate(
        SINGLETON_ID,
        { $set: set, $setOnInsert: { _id: SINGLETON_ID } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec() as Promise<AppSettingsDocument>;
  }
}
