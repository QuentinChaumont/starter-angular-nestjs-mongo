import { Module } from '@nestjs/common';
import {
  AppConfigModule,
  AppHttpModule,
  AppSecurityModule,
  HealthModule,
  LoggerModule,
} from '@org/backend-core';
import { AuthModule } from '@org/backend-auth';
import { AuthResetModule } from '@org/backend-auth-reset';
import { MongoModule } from '@org/backend-database-mongo';
import { MailerModule } from '@org/backend-mailer';
import { RoleModule } from '@org/backend-features-role';
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
    RoleModule,
    AuthModule,
    AuthResetModule,
  ],
})
export class AppModule {}
