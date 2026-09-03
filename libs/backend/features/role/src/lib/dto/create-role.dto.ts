import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { CreateRoleRequest } from '@org/shared-contracts';

/** Payload accepted by `POST /roles` (admin-only). */
export class CreateRoleDto implements CreateRoleRequest {
  @ApiProperty({ example: 'editor' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @ApiPropertyOptional({ example: 'Can publish content' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
