import { HealthCheckService, HealthCheckError, MongooseHealthIndicator } from '@nestjs/terminus';
import { MongoReadinessController } from './mongo-readiness.controller';

function buildController(mongoUp: boolean) {
  const pingCheck = jest
    .fn()
    .mockResolvedValue(mongoUp ? { mongo: { status: 'up' } } : { mongo: { status: 'down' } });
  const check = jest.fn(async (indicators: Array<() => Promise<Record<string, unknown>>>) => {
    const results = await Promise.all(indicators.map((indicator) => indicator()));
    if (!mongoUp) {
      throw new HealthCheckError('Readiness check failed', Object.assign({}, ...results));
    }
    return { status: 'ok', info: Object.assign({}, ...results), error: {}, details: {} };
  });

  const health = { check } as unknown as HealthCheckService;
  const mongoose = { pingCheck } as unknown as MongooseHealthIndicator;
  return { controller: new MongoReadinessController(health, mongoose), pingCheck, check };
}

describe('MongoReadinessController', () => {
  it('reports ok when the Mongoose ping indicator is up', async () => {
    const { controller, pingCheck } = buildController(true);

    const result = await controller.ready();

    expect(pingCheck).toHaveBeenCalledWith('mongo');
    expect(result.status).toBe('ok');
  });

  it('propagates a HealthCheckError when the Mongoose ping indicator is down', async () => {
    const { controller } = buildController(false);

    await expect(controller.ready()).rejects.toThrow(HealthCheckError);
  });
});
