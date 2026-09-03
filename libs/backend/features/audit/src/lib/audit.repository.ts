import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BaseRepository } from '@org/backend-database-mongo';
import { Model } from 'mongoose';
import { AuditEvent } from './audit.schema';

@Injectable()
export class AuditRepository extends BaseRepository<AuditEvent> {
  constructor(@InjectModel(AuditEvent.name) model: Model<AuditEvent>) {
    super(model);
  }

  /** The distinct `action` values seen so far — feeds the console's filter. */
  distinctActions(): Promise<string[]> {
    return this.model.distinct('action').exec() as Promise<string[]>;
  }

  /**
   * Ensures the retention TTL index matches `retentionDays` (0 = no TTL).
   * Called at bootstrap so a changed `AUDIT_RETENTION_DAYS` takes effect
   * without a manual migration.
   */
  async syncRetentionIndex(retentionDays: number): Promise<void> {
    const name = 'at_ttl';
    const coll = this.model.collection;
    const existing = (await coll.indexes()).find(
      (index: { name?: string }) => index.name === name,
    ) as { expireAfterSeconds?: number } | undefined;

    if (retentionDays <= 0) {
      if (existing) {
        await coll.dropIndex(name);
      }
      return;
    }

    const expireAfterSeconds = retentionDays * 24 * 60 * 60;
    if (existing && existing.expireAfterSeconds === expireAfterSeconds) {
      return;
    }
    if (existing) {
      await coll.dropIndex(name);
    }
    await coll.createIndex({ at: 1 }, { name, expireAfterSeconds });
  }
}
