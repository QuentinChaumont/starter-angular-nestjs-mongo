import { HealthCheckService } from '@nestjs/terminus';
import { LivenessController } from './liveness.controller';

describe('LivenessController', () => {
  it('checks with no indicators, so an outage elsewhere never fails it', async () => {
    const check = jest.fn().mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });
    const health = { check } as unknown as HealthCheckService;
    const controller = new LivenessController(health);

    const result = await controller.live();

    expect(check).toHaveBeenCalledWith([]);
    expect(result.status).toBe('ok');
  });
});
