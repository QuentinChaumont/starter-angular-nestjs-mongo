import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { AppConfigService, RequestContextService } from '@org/backend-core';
import type {
  AuditEvent as AuditEventDto,
  PaginatedAuditEvents,
} from '@org/shared-contracts';
import { AuditRepository } from './audit.repository';
import { AuditEventDocument } from './audit.schema';

/** Keys never persisted in `meta` (defence in depth — callers shouldn't
 * pass them anyway). */
const FORBIDDEN_META_KEY = /pass|secret|token|otp|code|credential/i;

export interface AuditRecordInput {
  action: string;
  /** Explicit actor — defaults to the request-context caller when omitted. */
  actorId?: string;
  actorEmail?: string;
  target?: string;
  targetType?: string;
  meta?: Record<string, unknown>;
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  /** Matches `actorId` exactly or `actorEmail` (contains, case-insensitive). */
  actor?: string;
  /** Substring, case-insensitive (`auth.` narrows to every auth event). */
  action?: string;
  from?: string;
  to?: string;
  dir?: 'asc' | 'desc';
}

function toDto(row: AuditEventDocument): AuditEventDto {
  return {
    id: row._id.toString(),
    actorId: row.actorId ?? null,
    actorEmail: row.actorEmail ?? null,
    action: row.action,
    target: row.target ?? null,
    targetType: row.targetType ?? null,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    meta: row.meta ?? null,
    at: row.at.toISOString(),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The audit log (V2.3 step 45). {@link record} is **best-effort**: it never
 * throws and does not block the caller — a failed write is logged and
 * dropped, exactly like the mailer brick's fire-and-forget sends.
 */
@Injectable()
export class AuditService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly repository: AuditRepository,
    private readonly config: AppConfigService,
    private readonly requestContext: RequestContextService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.repository.syncRetentionIndex(this.config.audit.retentionDays);
    } catch (error) {
      this.logger.error(
        `Could not sync the audit retention index: ${errorMessage(error)}`,
      );
    }
  }

  /** Fire-and-forget. Fills actor / ip / userAgent from the request context
   * when not given explicitly. */
  record(input: AuditRecordInput): void {
    const actor = this.requestContext.actor;
    void this.repository
      .create({
        action: input.action,
        actorId: input.actorId ?? actor?.id,
        actorEmail: input.actorEmail,
        target: input.target,
        targetType: input.targetType,
        ip: actor?.ip,
        userAgent: actor?.userAgent,
        meta: sanitizeMeta(input.meta),
        at: new Date(),
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to write audit event "${input.action}": ${errorMessage(error)}`,
        );
      });
  }

  async list(query: AuditQuery): Promise<PaginatedAuditEvents> {
    const clauses: Record<string, unknown>[] = [];

    const actor = query.actor?.trim();
    if (actor) {
      clauses.push({
        $or: [
          { actorId: actor },
          { actorEmail: { $regex: escapeRegex(actor), $options: 'i' } },
        ],
      });
    }
    const action = query.action?.trim();
    if (action) {
      clauses.push({
        action: { $regex: escapeRegex(action), $options: 'i' },
      });
    }
    const at: Record<string, Date> = {};
    if (query.from && !Number.isNaN(Date.parse(query.from))) {
      at.$gte = new Date(query.from);
    }
    if (query.to && !Number.isNaN(Date.parse(query.to))) {
      at.$lte = new Date(query.to);
    }
    if (Object.keys(at).length > 0) {
      clauses.push({ at });
    }

    const filter = clauses.length ? { $and: clauses } : {};
    const page = await this.repository.findPage(
      filter,
      { page: query.page, pageSize: query.pageSize },
      { at: query.dir === 'asc' ? 1 : -1 },
    );
    return { ...page, items: page.items.map(toDto) };
  }

  actions(): Promise<string[]> {
    return this.repository.distinctActions();
  }
}

function sanitizeMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!meta) {
    return undefined;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (!FORBIDDEN_META_KEY.test(key)) {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
