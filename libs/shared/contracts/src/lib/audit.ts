/**
 * Contracts for the audit log (V2.3 step 45). Read-only, admin-only — the
 * collection is append-only and there is no write endpoint.
 */
import type { PaginatedResponse } from './pagination.js';

/** One row of `GET /api/audit`. */
export interface AuditEvent {
  id: string;
  /** The account that acted, or `null` for anonymous / system events. */
  actorId: string | null;
  /** Plaintext email when there is no `actorId` (a failed login). */
  actorEmail: string | null;
  /** Dotted, lowercase (`auth.login`, `admin.roles-changed`, …). */
  action: string;
  /** The entity acted on (usually a user id). */
  target: string | null;
  targetType: string | null;
  ip: string | null;
  userAgent: string | null;
  /** Extra context, never secrets. */
  meta: Record<string, unknown> | null;
  /** ISO timestamp. */
  at: string;
}

/** `GET /api/audit?page=&pageSize=&actor=&action=&from=&to=&dir=` */
export type PaginatedAuditEvents = PaginatedResponse<AuditEvent>;
