import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './environment-variables';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  get app() {
    return {
      environment: this.configService.get('NODE_ENV', { infer: true }),
      port: this.configService.get('PORT', { infer: true }),
    };
  }

  get http() {
    return {
      corsOrigins: this.configService.get('CORS_ORIGINS', { infer: true }),
    };
  }

  get security() {
    return {
      rateLimit: {
        ttlSeconds: this.configService.get('RATE_LIMIT_TTL_SECONDS', {
          infer: true,
        }),
        limit: this.configService.get('RATE_LIMIT_LIMIT', { infer: true }),
      },
    };
  }

  get mongo() {
    return {
      uri: this.configService.get('MONGO_URI', { infer: true }),
    };
  }

  get jwt() {
    return {
      secret: this.configService.get('JWT_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', { infer: true }),
    };
  }

  get session() {
    return {
      refreshExpiresIn: this.configService.get('REFRESH_EXPIRES_IN', {
        infer: true,
      }),
      cookieSecure: this.configService.get('AUTH_COOKIE_SECURE', {
        infer: true,
      }),
    };
  }

  get oidc() {
    return {
      issuer: this.configService.get('OIDC_ISSUER', { infer: true }),
      clientId: this.configService.get('OIDC_CLIENT_ID', { infer: true }),
      clientSecret: this.configService.get('OIDC_CLIENT_SECRET', {
        infer: true,
      }),
      redirectUri: this.configService.get('OIDC_REDIRECT_URI', { infer: true }),
      scopes: this.configService.get('OIDC_SCOPES', { infer: true }),
      postLoginRedirect: this.configService.get('OIDC_POST_LOGIN_REDIRECT', {
        infer: true,
      }),
      frontendUrl: this.configService.get('OIDC_FRONTEND_URL', { infer: true }),
      requireVerifiedEmail: this.configService.get(
        'OIDC_REQUIRE_VERIFIED_EMAIL',
        { infer: true },
      ),
      rolesClaim: this.configService.get('OIDC_ROLES_CLAIM', { infer: true }),
    };
  }
}
