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
      authRateLimit: {
        ttlSeconds:
          this.configService.get('AUTH_RATE_LIMIT_TTL_SECONDS', {
            infer: true,
          }) ?? 60,
        limit:
          this.configService.get('AUTH_RATE_LIMIT_LIMIT', { infer: true }) ??
          10,
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

  get auth() {
    return {
      // Self-service registration is on unless explicitly disabled.
      registrationEnabled:
        this.configService.get('AUTH_REGISTRATION_ENABLED', { infer: true }) !==
        false,
      // Soft by default: an unverified account can still sign in.
      requireVerifiedEmail:
        this.configService.get('AUTH_REQUIRE_VERIFIED_EMAIL', {
          infer: true,
        }) === true,
      resetTokenTtlMinutes:
        this.configService.get('RESET_TOKEN_TTL_MINUTES', { infer: true }) ??
        60,
      verificationTokenTtlHours:
        this.configService.get('VERIFICATION_TOKEN_TTL_HOURS', {
          infer: true,
        }) ?? 24,
      // Min delay between two *manual* "resend verification email" requests
      // for one account (the automatic send on sign-up is exempt).
      verificationResendCooldownSeconds:
        this.configService.get('VERIFICATION_RESEND_COOLDOWN_SECONDS', {
          infer: true,
        }) ?? 300,
    };
  }

  get seedAdmin() {
    return {
      email: this.configService.get('SEED_ADMIN_EMAIL', { infer: true }),
      password: this.configService.get('SEED_ADMIN_PASSWORD', { infer: true }),
    };
  }

  get audit() {
    return {
      // Days an audit event is kept; 0 = keep forever (TTL index dropped).
      retentionDays:
        this.configService.get('AUDIT_RETENTION_DAYS', { infer: true }) ?? 90,
    };
  }

  get mailer() {
    return {
      smtpUrl: this.configService.get('SMTP_URL', { infer: true }),
      from:
        this.configService.get('MAIL_FROM', { infer: true }) ??
        'no-reply@localhost',
      previewDir:
        this.configService.get('MAIL_PREVIEW_DIR', { infer: true }) ??
        'tmp/mail',
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

  /** Google sign-in preset credentials (see {@link oidc} for the shared bits). */
  get oidcGoogle() {
    return {
      clientId: this.configService.get('OIDC_GOOGLE_CLIENT_ID', {
        infer: true,
      }),
      clientSecret: this.configService.get('OIDC_GOOGLE_CLIENT_SECRET', {
        infer: true,
      }),
    };
  }

  /** Keycloak preset config (see {@link oidc} for the shared bits). */
  get oidcKeycloak() {
    return {
      issuer: this.configService.get('OIDC_KEYCLOAK_ISSUER', { infer: true }),
      clientId: this.configService.get('OIDC_KEYCLOAK_CLIENT_ID', {
        infer: true,
      }),
      clientSecret: this.configService.get('OIDC_KEYCLOAK_CLIENT_SECRET', {
        infer: true,
      }),
      rolesClaim: this.configService.get('OIDC_KEYCLOAK_ROLES_CLAIM', {
        infer: true,
      }),
      label: this.configService.get('OIDC_KEYCLOAK_LABEL', { infer: true }),
    };
  }
}
