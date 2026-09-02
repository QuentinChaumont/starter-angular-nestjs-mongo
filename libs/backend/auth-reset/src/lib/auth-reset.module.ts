import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '@org/backend-auth';
import { MailerModule } from '@org/backend-mailer';
import { UserModule } from '@org/backend-features-user';
import { AuthResetController } from './reset/auth-reset.controller';
import { AuthResetService } from './reset/auth-reset.service';
import { PasswordResetTokenRepository } from './reset/password-reset-token.repository';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './reset/password-reset-token.schema';
import { PasswordResetService } from './reset/password-reset.service';
import { EmailVerificationTokenRepository } from './verification/email-verification-token.repository';
import {
  EmailVerificationToken,
  EmailVerificationTokenSchema,
} from './verification/email-verification-token.schema';
import { EmailVerificationService } from './verification/email-verification.service';

/**
 * The `auth-reset` brick (V2.1 step 33): "forgot password" + email
 * verification. Opt-in, and needs the `mailer` brick — installed by
 * `nx g @org/starter-plugin:auth-reset`.
 */
@Module({
  imports: [
    AuthModule,
    UserModule,
    MailerModule,
    MongooseModule.forFeature([
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      {
        name: EmailVerificationToken.name,
        schema: EmailVerificationTokenSchema,
      },
    ]),
  ],
  controllers: [AuthResetController],
  providers: [
    PasswordResetTokenRepository,
    PasswordResetService,
    EmailVerificationTokenRepository,
    EmailVerificationService,
    AuthResetService,
  ],
})
export class AuthResetModule {}
