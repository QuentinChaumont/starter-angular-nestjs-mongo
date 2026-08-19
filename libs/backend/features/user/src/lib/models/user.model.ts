/**
 * Plain data shape for a User, independent from persistence concerns.
 * Mirrored by `@Prop()` decorators on the schema class in `user.schema.ts`.
 */
export interface UserModel {
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}
