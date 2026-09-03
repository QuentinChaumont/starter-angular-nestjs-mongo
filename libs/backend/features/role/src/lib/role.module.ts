import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ROLE_CATALOG, UserModule } from '@org/backend-features-user';
import { RoleCatalogService } from './role-catalog.service';
import { RoleController } from './role.controller';
import { RoleRepository } from './role.repository';
import { Role, RoleSchema } from './role.schema';
import { RoleService } from './role.service';

/**
 * Role catalogue (V2.2 step 44). `@Global()` — like the mailer brick — so
 * it can back-fill `user`'s optional `ROLE_CATALOG` token (used deep in
 * `UserService`) without `user` importing this module. Depends on `user`
 * for the `ROLE_IN_USE` count; `RoleCatalogService` is deliberately
 * `UserService`-free to keep DI acyclic.
 */
@Global()
@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  ],
  controllers: [RoleController],
  providers: [
    RoleRepository,
    RoleCatalogService,
    RoleService,
    { provide: ROLE_CATALOG, useExisting: RoleCatalogService },
  ],
  exports: [RoleService, ROLE_CATALOG],
})
export class RoleModule {}
