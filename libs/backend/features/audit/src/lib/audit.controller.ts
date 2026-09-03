import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@org/backend-core';
import type { PaginatedAuditEvents } from '@org/shared-contracts';
import { AuditService } from './audit.service';

/**
 * Read-only audit console (V2.3 step 45). Admin-only via the global
 * `OptionalJwtAuthGuard` + `RolesGuard` bound by the auth brick. There is
 * no write endpoint — the collection is append-only, filled by
 * `AuditService.record()` from event listeners.
 */
@ApiTags('audit')
@ApiBearerAuth()
@Roles('admin')
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('actor') actor?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dir') dir?: string,
  ): Promise<PaginatedAuditEvents> {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      actor,
      action,
      from,
      to,
      dir: dir === 'asc' ? 'asc' : 'desc',
    });
  }

  @Get('actions')
  actions(): Promise<string[]> {
    return this.service.actions();
  }
}
