import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AppLogger } from './app-logger.service';
import { RequestContextService } from './request-context.service';

interface HttpError {
  status?: number;
}

/**
 * One access line per HTTP request — `METHOD /path status Xms`, plus
 * `actor=<id>` once authentication has resolved the caller. The request id
 * rides along automatically via {@link AppLogger}'s request context.
 *
 * Bound app-wide by {@link LoggerModule}. Silent under `NODE_ENV=test` so
 * supertest-heavy suites don't drown their own output.
 */
@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly silent = process.env['NODE_ENV'] === 'test';

  constructor(
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.silent || context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const method = req.method;
    const url = req.originalUrl;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.write(method, url, res.statusCode, startedAt),
        error: (err: HttpError) =>
          this.write(method, url, err?.status ?? 500, startedAt),
      }),
    );
  }

  private write(
    method: string,
    url: string,
    status: number,
    startedAt: number,
  ): void {
    const ms = Date.now() - startedAt;
    const actor = this.requestContext.actor?.id;
    const suffix = actor ? ` actor=${actor}` : '';
    this.logger.log(`${method} ${url} ${status} ${ms}ms${suffix}`, 'HTTP');
  }
}
