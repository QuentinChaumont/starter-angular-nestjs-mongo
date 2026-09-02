import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import {
  AppConfigModule,
  AppConfigService,
  OptionalJwtAuthGuard,
  RolesGuard,
} from '@org/backend-core';
import { UserModule } from '@org/backend-features-user';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCookieService } from './cookies/auth-cookie.service';
import { CsrfGuard } from './csrf/csrf.guard';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
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
        return {
          secret,
          signOptions: { expiresIn: expiresIn as `${number}` },
        };
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
    AuthThrottlerGuard,
    OidcService,
    OidcUserLinker,
    // Global authz: `OptionalJwtAuthGuard` attaches `request.user` when a
    // valid bearer token is present (no-op otherwise), then `RolesGuard`
    // enforces `@Roles(...)` — so any controller in the app (e.g. the
    // `user` feature) can restrict routes to a role just by decorating
    // them, without importing the auth brick.
    { provide: APP_GUARD, useClass: OptionalJwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, RefreshTokenService],
})
export class AuthModule {}
