import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsString } from 'class-validator';
import type {
  UpdateRolesRequest,
  UpdateStatusRequest,
} from '@org/shared-contracts';

export class UpdateRolesDto implements UpdateRolesRequest {
  @ApiProperty({ example: ['admin'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  roles!: string[];
}

export class UpdateStatusDto implements UpdateStatusRequest {
  @ApiProperty({ example: false })
  @IsBoolean()
  active!: boolean;
}
