import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@org/backend-core';
import type { PaginatedRoles, Role } from '@org/shared-contracts';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';

/**
 * Role catalogue CRUD (V2.2 step 44). Admin-only — the global
 * `OptionalJwtAuthGuard` + `RolesGuard` from the auth brick enforce
 * `@Roles('admin')`. `RolesGuard` itself is untouched: it still compares
 * `user.roles` names.
 */
@ApiTags('roles')
@ApiBearerAuth()
@Roles('admin')
@Controller('roles')
export class RoleController {
  constructor(private readonly service: RoleService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('dir') dir?: string,
  ): Promise<PaginatedRoles> {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      sort,
      dir: dir === 'desc' ? 'desc' : dir === 'asc' ? 'asc' : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Role> {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.service.update(id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
