import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * One append-only audit record (V2.3 step 45). Written best-effort by
 * `AuditService.record()` — a failed write is logged and swallowed, never
 * surfaced to the request that triggered it. No `updatedAt` (rows are never
 * modified); retention is a TTL index on `at`, sized from
 * `AUDIT_RETENTION_DAYS` at bootstrap.
 */
@Schema({ collection: 'audit_events', timestamps: false })
export class AuditEvent {
  /** The account that performed the action. `null` for anonymous / system
   * events (a failed login, a token-reuse alert). */
  @Prop({ index: true })
  actorId?: string;

  /** Plaintext email when there is no `actorId` (failed login attempt). */
  @Prop()
  actorEmail?: string;

  /** Dotted, lowercase — `auth.login`, `admin.roles-changed`, … */
  @Prop({ required: true, index: true })
  action!: string;

  /** The entity the action was about (usually a user id). */
  @Prop()
  target?: string;

  @Prop()
  targetType?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  /** Extra context — never secrets (`AuditService` strips password / token
   * / secret / code keys). */
  @Prop({ type: Object })
  meta?: Record<string, unknown>;

  @Prop({ required: true, default: () => new Date() })
  at!: Date;
}

export type AuditEventDocument = HydratedDocument<AuditEvent>;

export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);

AuditEventSchema.index({ actorId: 1, at: -1 });
AuditEventSchema.index({ action: 1, at: -1 });
