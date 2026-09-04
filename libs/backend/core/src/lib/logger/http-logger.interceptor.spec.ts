import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { HttpLoggerInterceptor } from './http-logger.interceptor';

function contextFor(
  req: Partial<{ method: string; originalUrl: string }>,
  res: Partial<{ statusCode: number }>,
): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

describe('HttpLoggerInterceptor', () => {
  const log = jest.fn();
  const logger = { log } as unknown as import('./app-logger.service').AppLogger;
  let actorId: string | undefined;
  const requestContext = {
    get actor() {
      return actorId ? { id: actorId } : undefined;
    },
  } as unknown as import('./request-context.service').RequestContextService;

  const original = process.env['NODE_ENV'];

  beforeEach(() => {
    log.mockReset();
    actorId = undefined;
    process.env['NODE_ENV'] = 'development';
  });

  afterAll(() => {
    process.env['NODE_ENV'] = original;
  });

  it('logs one access line with method, path, status and duration', async () => {
    const interceptor = new HttpLoggerInterceptor(logger, requestContext);
    const ctx = contextFor(
      { method: 'GET', originalUrl: '/api/users/me' },
      { statusCode: 200 },
    );
    const next: CallHandler = { handle: () => of({ ok: true }) };

    await lastValueFrom(interceptor.intercept(ctx, next));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^GET \/api\/users\/me 200 \d+ms$/),
      'HTTP',
    );
  });

  it('appends the actor id once authentication has resolved it', async () => {
    actorId = 'user-1';
    const interceptor = new HttpLoggerInterceptor(logger, requestContext);
    const ctx = contextFor(
      { method: 'POST', originalUrl: '/api/auth/login' },
      { statusCode: 201 },
    );

    await lastValueFrom(
      interceptor.intercept(ctx, { handle: () => of(null) }),
    );

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('POST /api/auth/login 201'),
      'HTTP',
    );
    expect(log.mock.calls[0][0]).toContain('actor=user-1');
  });

  it('logs the error status when the handler throws', async () => {
    const interceptor = new HttpLoggerInterceptor(logger, requestContext);
    const ctx = contextFor(
      { method: 'GET', originalUrl: '/api/nope' },
      { statusCode: 200 },
    );
    const next: CallHandler = {
      handle: () => throwError(() => ({ status: 404 })),
    };

    await expect(
      lastValueFrom(interceptor.intercept(ctx, next)),
    ).rejects.toBeDefined();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/nope 404'),
      'HTTP',
    );
  });

  it('stays silent under NODE_ENV=test', async () => {
    process.env['NODE_ENV'] = 'test';
    const interceptor = new HttpLoggerInterceptor(logger, requestContext);
    const ctx = contextFor(
      { method: 'GET', originalUrl: '/api/x' },
      { statusCode: 200 },
    );

    await lastValueFrom(
      interceptor.intercept(ctx, { handle: () => of(1) }),
    );

    expect(log).not.toHaveBeenCalled();
  });
});
