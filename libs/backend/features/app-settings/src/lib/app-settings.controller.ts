import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import { AppSettings } from './app-settings.defaults';
import { AppSettingsService } from './app-settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

/** Admin-only settings console. Restricted by the global `RolesGuard`
 * reading `@Roles('admin')` — no local guard needed. */
@ApiTags('settings')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/settings')
export class AppSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Get()
  get(): Promise<AppSettings> {
    return this.service.get();
  }

  @Patch()
  patch(
    @Body() body: UpdateSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppSettings> {
    return this.service.update(body, { changedBy: user.id });
  }
}
