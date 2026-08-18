import { Module } from '@nestjs/common';
import { AppConfigModule, LoggerModule } from '@org/backend-core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
