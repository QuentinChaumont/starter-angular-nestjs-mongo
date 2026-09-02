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
import { MailerModule } from '@org/backend-mailer';
import { UserModule } from '@org/backend-features-user';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    AppHttpModule,
    AppSecurityModule,
    HealthModule,
    MongoModule,
    MailerModule,
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
