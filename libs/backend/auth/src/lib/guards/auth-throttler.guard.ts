import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppConfigService, TooManyRequestsError } from '@org/backend-core';
import type { Request } from 'express';

/**
 * A stricter, dedicated rate limiter for the credential endpoints
 * (`POST /auth/login`, `POST /auth/register`) — the global throttler's
 * budget is far too generous to slow down password guessing or signup
 * abuse.
 *
 * In-memory sliding window keyed by `method + path + client IP`. Fine for a
 * single instance; a multi-instance deployment would swap this for a shared
 * store (Redis) — explicitly out of scope for the starter.
 */
@Injectable()
export class AuthThrottlerGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const { ttlSeconds, limit } = this.config.security.authRateLimit;
    const windowMs = ttlSeconds * 1000;
    const now = Date.now();

    const request = context.switchToHttp().getRequest<Request>();
    const key = `${request.method}:${request.path}:${request.ip ?? 'unknown'}`;

    const recent = (this.hits.get(key) ?? []).filter(
      (at) => now - at < windowMs,
    );

    if (recent.length >= limit) {
      this.hits.set(key, recent);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowMs - (now - recent[0])) / 1000),
      );
      throw new TooManyRequestsError(
        'TOO_MANY_REQUESTS',
        'Too many attempts. Please wait a moment and try again.',
        { retryAfterSeconds },
      );
    }

    recent.push(now);
    this.hits.set(key, recent);
    this.pruneExpired(now, windowMs);
    return true;
  }

  /** Keep the map from growing without bound on a long-running process. */
  private pruneExpired(now: number, windowMs: number): void {
    for (const [key, times] of this.hits) {
      const kept = times.filter((at) => now - at < windowMs);
      if (kept.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, kept);
      }
    }
  }
}
