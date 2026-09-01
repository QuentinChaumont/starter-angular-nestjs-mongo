import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AppConfigModule, AppConfigService } from '@org/backend-core';
import { UserModule } from '@org/backend-features-user';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCookieService } from './cookies/auth-cookie.service';
import { CsrfGuard } from './csrf/csrf.guard';
import { OidcController } from './oidc/oidc.controller';
import { OidcUserLinker } from './oidc/oidc-user.linker';
import { OidcService } from './oidc/oidc.service';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './refresh/refresh-token.schema';
import { RefreshTokenRepository } from './refresh/refresh-token.repository';
import { RefreshTokenService } from './refresh/refresh-token.service';
import { resolveJwtConfig } from './resolve-jwt-config';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const { secret, expiresIn } = resolveJwtConfig(config);
        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  controllers: [AuthController, OidcController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenRepository,
    RefreshTokenService,
    AuthCookieService,
    CsrfGuard,
    OidcService,
    OidcUserLinker,
  ],
  exports: [AuthService, RefreshTokenService],
})
export class AuthModule {}
