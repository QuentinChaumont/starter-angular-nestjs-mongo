import { Module } from '@nestjs/common';
import { AppConfigModule, AppHttpModule, LoggerModule } from '@org/backend-core';
import { MongoModule } from '@org/backend-database-mongo';
import { UserModule } from '@org/backend-features-user';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    MongoModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
