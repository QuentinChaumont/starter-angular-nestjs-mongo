import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

/**
 * Liveness only proves the Nest process is up and answering HTTP requests —
 * it runs no external checks, so a downstream outage (e.g. Mongo) never
 * takes this endpoint down. Kubernetes should restart the pod only when
 * this fails.
 */
@Controller('health')
export class LivenessController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }
}
