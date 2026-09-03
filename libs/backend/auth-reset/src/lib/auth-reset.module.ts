import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '@org/backend-auth';
import { MailerModule } from '@org/backend-mailer';
import { UserModule } from '@org/backend-features-user';
import { AuthResetController } from './reset/auth-reset.controller';
import { AuthResetService } from './reset/auth-reset.service';
import { PasswordResetService } from './reset/password-reset.service';
import {
  SingleUseToken,
  SingleUseTokenSchema,
} from './single-use-token.schema';
import { SingleUseTokenRepository } from './single-use-token.repository';
import { EmailVerificationService } from './verification/email-verification.service';

/**
 * The `auth-reset` brick (V2.1 step 33): "forgot password" + email
 * verification. Both flows persist their links in one `single_use_tokens`
 * collection (told apart by `purpose`). Opt-in, and needs the `mailer`
 * brick — installed by `nx g @org/starter-plugin:auth-reset`.
 */
@Module({
  imports: [
    AuthModule,
    UserModule,
    MailerModule,
    MongooseModule.forFeature([
      { name: SingleUseToken.name, schema: SingleUseTokenSchema },
    ]),
  ],
  controllers: [AuthResetController],
  providers: [
    SingleUseTokenRepository,
    PasswordResetService,
    EmailVerificationService,
    AuthResetService,
  ],
})
export class AuthResetModule {}
