/**
 * Plain data shape for a Role, independent from persistence concerns.
 * Mirrored by `@Prop()` decorators on the schema class in `role.schema.ts`.
 */
export interface RoleModel {
  name: string;
  description?: string;
  system: boolean;
  createdAt: Date;
  updatedAt: Date;
}
