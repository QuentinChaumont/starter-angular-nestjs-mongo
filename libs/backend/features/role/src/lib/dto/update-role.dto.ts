import { PartialType } from '@nestjs/swagger';
import type { UpdateRoleRequest } from '@org/shared-contracts';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto
  extends PartialType(CreateRoleDto)
  implements UpdateRoleRequest {}
