import { INestApplication } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { AppConfigService } from '../config/app-config.service';

/**
 * HTTP-level protections that apply regardless of route: security headers
 * (Helmet), response compression and CORS. Rate limiting is wired
 * separately via `AppSecurityModule`, since it needs to run through Nest's
 * DI/guard pipeline rather than as Express middleware.
 */
export function setupSecurity(app: INestApplication): void {
  app.use(helmet());
  app.use(compression());

  const config = app.get(AppConfigService);
  // `credentials: true` so the browser sends the httpOnly refresh cookie on
  // cross-origin calls (SPA and API on different hosts).
  app.enableCors({ origin: config.http.corsOrigins, credentials: true });
}
