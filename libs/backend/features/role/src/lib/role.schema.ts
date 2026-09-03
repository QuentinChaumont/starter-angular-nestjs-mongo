import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Persistence schema for Role (V2.2 step 44). `name` is what lands in
 * `user.roles` and what `@Roles('admin')` compares against — kept lowercase
 * and space-free. `system` roles (`admin`) are protected from rename /
 * delete through the CRUD.
 */
@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ default: false })
  system!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type RoleDocument = HydratedDocument<Role>;

export const RoleSchema = SchemaFactory.createForClass(Role);
