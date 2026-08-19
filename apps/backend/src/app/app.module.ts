import { Module } from '@nestjs/common';
import { AppConfigModule, AppHttpModule, LoggerModule } from '@org/backend-core';
import { MongoModule } from '@org/backend-database-mongo';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AppConfigModule, LoggerModule, AppHttpModule, MongoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
