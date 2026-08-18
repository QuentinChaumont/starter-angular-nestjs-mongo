import { Module } from '@nestjs/common';
import { AppConfigModule } from '@org/backend-core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
