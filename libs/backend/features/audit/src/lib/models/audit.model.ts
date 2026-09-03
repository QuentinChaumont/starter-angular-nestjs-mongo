/**
 * Plain data shape for an audit event, independent from persistence.
 * Mirrored by `@Prop()` decorators on the schema class in `audit.schema.ts`.
 */
export interface AuditEventModel {
  actorId?: string;
  actorEmail?: string;
  action: string;
  target?: string;
  targetType?: string;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
  at: Date;
}
