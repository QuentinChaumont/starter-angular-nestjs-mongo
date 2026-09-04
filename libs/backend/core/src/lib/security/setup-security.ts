import { INestApplication } from '@nestjs/common';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppConfigService } from '../config/app-config.service';

/**
 * HTTP-level protections that apply regardless of route: security headers
 * (Helmet), response compression, `trust proxy`, a no-store cache policy
 * for the API, and CORS. Rate limiting is wired separately via
 * `AppSecurityModule`, since it needs to run through Nest's DI/guard
 * pipeline rather than as Express middleware.
 */
export function setupSecurity(app: INestApplication): void {
  const config = app.get(AppConfigService);

  // Behind nginx / a load balancer / the `docker` brick, Express needs to
  // be told to trust `X-Forwarded-*` so `req.ip` is the real client (rate
  // limiting, audit, session IPs) and `req.protocol` is `https`.
  const { trustProxy } = config.http;
  if (trustProxy !== undefined) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  }

  app.use(helmet());
  app.use(compression());

  // API responses can carry account/session data — never let a shared
  // proxy or the browser's bfcache serve a stale copy.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  // `credentials: true` so the browser sends the httpOnly refresh cookie on
  // cross-origin calls (SPA and API on different hosts).
  app.enableCors({ origin: config.http.corsOrigins, credentials: true });
}
