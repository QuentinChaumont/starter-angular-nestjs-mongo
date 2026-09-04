import { Injectable, OnApplicationBootstrap, Optional } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { AppLogger } from './app-logger.service';

/**
 * A one-shot summary of the effective runtime configuration, logged once
 * the app is up. Onboarding aid: you see at a glance which optional
 * integrations are wired and which knobs are on their defaults, without
 * diffing `.env` against `.env.example`.
 */
@Injectable()
export class StartupSummaryService implements OnApplicationBootstrap {
  constructor(
    @Optional() private readonly config: AppConfigService | null,
    private readonly logger: AppLogger,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config || process.env['NODE_ENV'] === 'test') {
      return;
    }
    for (const line of this.lines(this.config)) {
      this.logger.log(line, 'Startup');
    }
  }

  private lines(config: AppConfigService): string[] {
    const { app, http, security, mongo, mailer, oidc, oidcGoogle, oidcKeycloak, auth, audit } =
      config;

    const yn = (on: boolean) => (on ? 'on' : 'off');
    const providers = [
      oidc.issuer ? 'generic' : null,
      oidcGoogle.clientId ? 'google' : null,
      oidcKeycloak.issuer ? 'keycloak' : null,
    ].filter(Boolean);

    return [
      'runtime configuration —',
      `  env:         ${app.environment}  port ${app.port}`,
      `  cors:        ${http.corsOrigins.join(', ') || '(none)'}`,
      `  trust proxy: ${http.trustProxy ?? 'off (direct exposure)'}`,
      `  mongo:       ${mongo.uri ? 'configured' : 'NOT configured — persistence disabled'}`,
      `  mailer:      ${mailer.smtpUrl ? 'SMTP' : `preview only → ${mailer.previewDir}`}`,
      `  oidc:        ${providers.length ? providers.join(', ') : 'none — password auth only'}`,
      `  auth:        registration ${yn(auth.registrationEnabled)}, verified-email required ${yn(auth.requireVerifiedEmail)}`,
      `  rate limit:  ${security.rateLimit.limit}/${security.rateLimit.ttlSeconds}s  (auth ${security.authRateLimit.limit}/${security.authRateLimit.ttlSeconds}s)`,
      `  audit:       ${audit.retentionDays === 0 ? 'kept forever' : `${audit.retentionDays}d retention`}`,
    ];
  }
}
