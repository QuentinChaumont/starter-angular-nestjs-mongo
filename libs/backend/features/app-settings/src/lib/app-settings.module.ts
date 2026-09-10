import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppSettingsEntity, AppSettingsSchema } from './app-settings.schema';
import { AppSettingsEvents } from './app-settings.events';
import { AppSettingsRepository } from './app-settings.repository';
import { AppSettingsService } from './app-settings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppSettingsEntity.name, schema: AppSettingsSchema },
    ]),
  ],
  providers: [AppSettingsRepository, AppSettingsService, AppSettingsEvents],
  exports: [AppSettingsService, AppSettingsEvents],
})
export class AppSettingsModule {}
