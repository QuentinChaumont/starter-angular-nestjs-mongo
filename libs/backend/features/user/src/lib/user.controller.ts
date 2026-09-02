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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles } from '@org/backend-core';
import type { AuthenticatedUser } from '@org/backend-core';
import type {
  PaginatedResponse,
  UserProfile,
  UserSummary,
} from '@org/shared-contracts';
import { UserService } from './user.service';
import { UpdateRolesDto, UpdateStatusDto } from './dto/admin-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Direct user administration. `@Roles('admin')` is enforced only when the
 * auth brick is installed (it binds the global `OptionalJwtAuthGuard` +
 * `RolesGuard`); on a socle-only app with no auth, these routes stay open.
 * Self-service sign-up goes through `POST /auth/register` instead.
 *
 * The `/me` routes (profile brick, V2.1 step 34) override the class-level
 * `@Roles('admin')` with an empty `@Roles()` — any authenticated user —
 * and add their own `JwtAuthGuard` so they still 401 without a token.
 */
@ApiTags('users')
@ApiBearerAuth()
@Roles('admin')
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Roles()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.service.getProfile(user.id);
  }

  @Roles()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.service.updateProfile(user.id, dto);
  }

  @Roles()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    await this.service.deleteAccount(user.id, dto.password);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  /** Admin console list — paginated, newest first, `?search=` on email/name. */
  @Get()
  listUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResponse<UserSummary>> {
    return this.service.listUsers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/roles')
  setRoles(
    @Param('id') id: string,
    @Body() dto: UpdateRolesDto,
  ): Promise<UserSummary> {
    return this.service.setRoles(id, dto.roles);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<UserSummary> {
    return this.service.setStatus(id, dto.active);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.updateById(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.deleteById(id);
  }
}
