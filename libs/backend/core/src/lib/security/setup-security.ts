import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { AppConfigService } from '../config/app-config.service';

/**
 * HTTP-level protections that apply regardless of route: security headers
 * (Helmet) and CORS. Rate limiting is wired separately via
 * `AppSecurityModule`, since it needs to run through Nest's DI/guard
 * pipeline rather than as Express middleware.
 */
export function setupSecurity(app: INestApplication): void {
  app.use(helmet());

  const config = app.get(AppConfigService);
  app.enableCors({ origin: config.http.corsOrigins });
}
