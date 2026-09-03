import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { RequestContextService } from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import type { Request } from 'express';
import { Observable } from 'rxjs';

/**
 * Bound app-wide by `AuthModule`. Runs after the global auth guards, so
 * `request.user` (when present) is copied into the request-scoped
 * {@link RequestContextService} — cross-cutting concerns like the audit
 * log then attribute an action to the caller without every service taking
 * an `actor` parameter.
 */
@Injectable()
export class RequestActorInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const req = context
        .switchToHttp()
        .getRequest<Request & { user?: AuthenticatedUser }>();
      if (req.user?.id) {
        this.requestContext.setActor({
          id: req.user.id,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    }
    return next.handle();
  }
}
