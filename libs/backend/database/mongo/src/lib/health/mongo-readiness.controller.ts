import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';

/**
 * Readiness lives here, next to Mongo, rather than in `backend-core`: a
 * project that doesn't install this module simply doesn't get a
 * `/health/ready` route contributed by Mongo, keeping `backend-core` free
 * of a Mongo dependency.
 */
@Controller('health')
export class MongoReadinessController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
  ) {}

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.mongoose.pingCheck('mongo')]);
  }
}
