import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SingleUseTokenFields } from '../single-use-token';

/** One row per issued email-verification link. See `SingleUseTokenFields`. */
@Schema({ collection: 'email_verification_tokens', timestamps: true })
export class EmailVerificationToken implements SingleUseTokenFields {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  consumedAt?: Date;
}

export type EmailVerificationTokenDocument =
  HydratedDocument<EmailVerificationToken>;

export const EmailVerificationTokenSchema = SchemaFactory.createForClass(
  EmailVerificationToken,
);

EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
