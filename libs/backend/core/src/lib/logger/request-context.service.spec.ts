import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  it('returns undefined outside of any run() scope', () => {
    const service = new RequestContextService();
    expect(service.requestId).toBeUndefined();
  });

  it('exposes the requestId inside a run() scope', () => {
    const service = new RequestContextService();

    service.run({ requestId: 'abc-123' }, () => {
      expect(service.requestId).toBe('abc-123');
    });
  });

  it('exposes the requestId to code called asynchronously within the scope', async () => {
    const service = new RequestContextService();

    await service.run({ requestId: 'async-id' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(service.requestId).toBe('async-id');
    });
  });

  it('isolates concurrent scopes from each other', async () => {
    const service = new RequestContextService();
    const seen: string[] = [];

    await Promise.all([
      service.run({ requestId: 'first' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        seen.push(service.requestId as string);
      }),
      service.run({ requestId: 'second' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        seen.push(service.requestId as string);
      }),
    ]);

    expect(seen.sort()).toEqual(['first', 'second']);
  });

  it('returns undefined again once the scope has ended', () => {
    const service = new RequestContextService();

    service.run({ requestId: 'scoped' }, () => {
      // no-op, just entering the scope
    });

    expect(service.requestId).toBeUndefined();
  });
});
