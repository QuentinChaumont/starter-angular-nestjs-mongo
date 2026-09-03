import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * One row per issued refresh token. The token itself is never stored — only
 * its SHA-256 (`tokenHash`). `family` ties together every token descended
 * from one login, so presenting an already-rotated token (`revokedAt` set)
 * can revoke the whole lineage as compromised.
 */
@Schema({ collection: 'refresh_tokens', timestamps: true })
export class RefreshToken {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true, index: true })
  family!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  revokedAt?: Date;

  /** Hash of the token that superseded this one, once rotated. */
  @Prop()
  replacedByHash?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  ip?: string;

  /** When the login that started this `family` happened — carried forward
   * across rotations so "Devices" shows the real session age, not the last
   * refresh (V2.3 step 46). Falls back to `createdAt` for pre-migration
   * rows. */
  @Prop()
  sessionStartedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Mongo drops rows itself once they expire — no app-side cron needed. The
// rotation path also prunes a user's expired rows opportunistically.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
