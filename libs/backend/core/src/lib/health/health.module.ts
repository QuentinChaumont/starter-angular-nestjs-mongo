import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { LivenessController } from './liveness.controller';

/**
 * Only wires liveness — it has no optional-brick dependencies (Mongo, etc)
 * to know about. Readiness checks live next to the brick they check (see
 * `MongoReadinessController` in `@org/backend-database-mongo`), so a
 * project without that brick simply doesn't get a route for it.
 */
@Module({
  imports: [TerminusModule],
  controllers: [LivenessController],
})
export class HealthModule {}
