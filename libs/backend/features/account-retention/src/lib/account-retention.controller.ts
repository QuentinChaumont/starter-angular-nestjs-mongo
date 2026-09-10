import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@org/backend-core';
import { AccountRetentionJob } from './account-retention.job';

/** Manual trigger for the retention sweep — same logic as the daily cron.
 * Admin-only. Useful for ops and for verifying configuration. */
@ApiTags('account-retention')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/account-retention')
export class AccountRetentionController {
  constructor(private readonly job: AccountRetentionJob) {}

  @Post('run')
  @HttpCode(200)
  run(): Promise<{ warned: number; deleted: number }> {
    return this.job.run();
  }
}
