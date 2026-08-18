import { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestIdMiddleware } from './request-id.middleware';

/**
 * Registers the request-id middleware as raw Express middleware, ahead of
 * Nest's router. `MiddlewareConsumer.forRoutes()` matches against the final
 * routed path (including the global prefix), where wildcard patterns can
 * fail to match a bare prefix route (e.g. `GET /api`) depending on the
 * installed path-to-regexp version. Registering directly with `app.use()`
 * guarantees every request is tagged, regardless of routing.
 */
export function useRequestIdMiddleware(app: INestApplication): void {
  const middleware = app.get(RequestIdMiddleware);
  app.use((req: Request, res: Response, next: NextFunction) =>
    middleware.use(req, res, next),
  );
}
