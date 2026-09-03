import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type {
  SingleUseTokenFields,
  SingleUseTokenPurpose,
} from './single-use-token';

/**
 * One row per issued single-use link — password reset **and** email
 * verification, told apart by `purpose`. They have the same shape, the same
 * TTL and the same "look it up by its hash" access pattern, so one
 * collection is enough. The raw token is never stored, only its SHA-256.
 * Mongo's TTL index on `expiresAt` sweeps stale rows — no app-side cron.
 */
@Schema({ collection: 'single_use_tokens', timestamps: true })
export class SingleUseToken implements SingleUseTokenFields {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({
    type: String,
    required: true,
    index: true,
    enum: ['reset-password', 'verify-email'],
  })
  purpose!: SingleUseTokenPurpose;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  consumedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SingleUseTokenDocument = HydratedDocument<SingleUseToken>;

export const SingleUseTokenSchema = SchemaFactory.createForClass(SingleUseToken);

// Mongo drops rows itself once they expire.
SingleUseTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Serves `latestIssuedAt` (resend cooldown) and `consumeAllForUser`.
SingleUseTokenSchema.index({ userId: 1, purpose: 1, createdAt: -1 });
