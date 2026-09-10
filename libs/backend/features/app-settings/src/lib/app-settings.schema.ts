import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** The single application-settings document. `_id` is pinned to the
 * constant {@link SINGLETON_ID} so there is only ever one. Sections are
 * stored as free-form sub-objects and validated in `AppSettingsService`,
 * not here — the schema stays stable as new settings are added. */
export const SINGLETON_ID = 'app';

@Schema({ timestamps: true, collection: 'appsettings' })
export class AppSettingsEntity {
  @Prop({ type: String, default: SINGLETON_ID })
  _id!: string;

  @Prop({ type: Object, default: {} })
  accountRetention!: {
    inactiveDays?: number | null;
    warningDays?: number | null;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppSettingsDocument = HydratedDocument<AppSettingsEntity>;
export const AppSettingsSchema = SchemaFactory.createForClass(AppSettingsEntity);
