import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Persistence schema for User, mirroring `UserModel` from
 * `./models/user.model`. `createdAt`/`updatedAt` are populated by Mongoose
 * via `timestamps: true` and only declared here for typing.
 *
 * `password` is excluded by default (`select: false`) and stripped from
 * JSON output regardless, so a hashed password never leaves the API even
 * if a future query opts into fetching it. It is **optional**: an account
 * created purely through OIDC (V2.2 step 42) has no local password until
 * the user sets one via "forgot password".
 */
@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret['password'];
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ type: [String], default: [] })
  roles!: string[];

  /** Set once the account's email address is confirmed. Unset ⇒ unverified.
   * Written by the `auth-reset` brick (V2.1 step 33). */
  @Prop()
  emailVerifiedAt?: Date;

  /** Set when an admin disables the account (V2.1 step 35). A disabled
   * account can't `login` or `refresh`. */
  @Prop()
  disabledAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
