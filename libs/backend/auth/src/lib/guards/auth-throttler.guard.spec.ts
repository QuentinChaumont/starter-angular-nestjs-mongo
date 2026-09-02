import { ExecutionContext } from '@nestjs/common';
import { AppConfigService } from '@org/backend-core';
import { AuthThrottlerGuard } from './auth-throttler.guard';

function context(ip = '10.0.0.1', path = '/api/auth/login'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', path, ip }),
    }),
  } as unknown as ExecutionContext;
}

function guardWith(limit: number, ttlSeconds = 60): AuthThrottlerGuard {
  const config = {
    security: { authRateLimit: { limit, ttlSeconds } },
  } as unknown as AppConfigService;
  return new AuthThrottlerGuard(config);
}

describe('AuthThrottlerGuard', () => {
  it('allows requests up to the limit, then throws 429', () => {
    const guard = guardWith(3);

    expect(guard.canActivate(context())).toBe(true);
    expect(guard.canActivate(context())).toBe(true);
    expect(guard.canActivate(context())).toBe(true);
    expect(() => guard.canActivate(context())).toThrow(
      /Too many attempts/,
    );
  });

  it('tracks each client IP separately', () => {
    const guard = guardWith(1);

    expect(guard.canActivate(context('1.1.1.1'))).toBe(true);
    expect(guard.canActivate(context('2.2.2.2'))).toBe(true);
    expect(() => guard.canActivate(context('1.1.1.1'))).toThrow();
  });

  it('forgets hits once the window has elapsed', () => {
    jest.useFakeTimers();
    try {
      const guard = guardWith(1, 60);
      expect(guard.canActivate(context())).toBe(true);
      expect(() => guard.canActivate(context())).toThrow();

      jest.advanceTimersByTime(61_000);
      expect(guard.canActivate(context())).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
