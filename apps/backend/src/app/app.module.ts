import { Module } from '@nestjs/common';
import {
  AppConfigModule,
  AppHttpModule,
  AppSecurityModule,
  HealthModule,
  LoggerModule,
} from '@org/backend-core';
import { AuthModule } from '@org/backend-auth';
import { MongoModule } from '@org/backend-database-mongo';
import { UserModule } from '@org/backend-features-user';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    AppSecurityModule,
    HealthModule,
    MongoModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
