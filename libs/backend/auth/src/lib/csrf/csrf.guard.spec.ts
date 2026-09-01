import { ExecutionContext } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

function buildContext(
  cookieHeader: string | undefined,
  csrfHeader: string | string[] | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { cookie: cookieHeader, 'x-csrf-token': csrfHeader },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('allows a request whose cookie and header tokens match', () => {
    const context = buildContext('csrf-token=tok123', 'tok123');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('uses the first value when the header is repeated', () => {
    const context = buildContext('csrf-token=tok123', ['tok123', 'other']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects when the header is missing', () => {
    const context = buildContext('csrf-token=tok123', undefined);
    expect(() => guard.canActivate(context)).toThrow(/CSRF token/);
  });

  it('rejects when the cookie is missing', () => {
    const context = buildContext(undefined, 'tok123');
    expect(() => guard.canActivate(context)).toThrow(/CSRF token/);
  });

  it('rejects when the two tokens differ', () => {
    const context = buildContext('csrf-token=tok123', 'nope');
    expect(() => guard.canActivate(context)).toThrow(/CSRF token/);
  });
});
