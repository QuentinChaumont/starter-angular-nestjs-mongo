import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '@org/backend-auth';
import { UserModule } from '@org/backend-features-user';
import { AuditController } from './audit.controller';
import { AuditListeners } from './audit.listeners';
import { AuditRepository } from './audit.repository';
import { AuditEvent, AuditEventSchema } from './audit.schema';
import { AuditService } from './audit.service';

/**
 * Audit log (V2.3 step 45). Subscribes to the `auth` / `user` bricks'
 * lifecycle events (they never import this module back) and exposes a
 * read-only, admin-only `GET /api/audit`.
 */
@Module({
  imports: [
    AuthModule,
    UserModule,
    MongooseModule.forFeature([
      { name: AuditEvent.name, schema: AuditEventSchema },
    ]),
  ],
  controllers: [AuditController],
  providers: [AuditRepository, AuditService, AuditListeners],
  exports: [AuditService],
})
export class AuditModule {}
