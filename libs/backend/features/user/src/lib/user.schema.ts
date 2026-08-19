import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Persistence schema for User, mirroring `UserModel` from
 * `./models/user.model`. `createdAt`/`updatedAt` are populated by Mongoose
 * via `timestamps: true` and only declared here for typing.
 *
 * `password` is excluded by default (`select: false`) and stripped from
 * JSON output regardless, so a hashed password never leaves the API even
 * if a future query opts into fetching it.
 */
@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete ret.password;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
