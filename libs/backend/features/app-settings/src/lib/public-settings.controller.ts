import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { PublicAppSettings } from '@org/shared-contracts';
import { AppSettingsService } from './app-settings.service';

/** Unauthenticated. No `@Roles(...)`, so the global `OptionalJwtAuthGuard`
 * + `RolesGuard` let it through. Returns only the whitelisted fields — it
 * must never spread the whole settings document. */
@ApiTags('settings')
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Get()
  async get(): Promise<PublicAppSettings> {
    const { accountRetention } = await this.service.get();
    return {
      accountRetention: {
        inactiveDays: accountRetention.inactiveDays,
        warningDays: accountRetention.warningDays,
      },
    };
  }
}
