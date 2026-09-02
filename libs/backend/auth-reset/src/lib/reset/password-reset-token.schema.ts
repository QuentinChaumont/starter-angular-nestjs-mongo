import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SingleUseTokenFields } from '../single-use-token';

/** One row per issued password-reset link. See `SingleUseTokenFields`. */
@Schema({ collection: 'password_reset_tokens', timestamps: true })
export class PasswordResetToken implements SingleUseTokenFields {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  consumedAt?: Date;
}

export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);

// Mongo drops rows itself once they expire — no app-side cron needed.
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
