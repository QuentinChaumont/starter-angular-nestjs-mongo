import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import type { ChangePasswordRequest } from '@org/shared-contracts';

const MIN_PASSWORD_LENGTH = 8;

export class ChangePasswordDto implements ChangePasswordRequest {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: 'Str0ng!Passw0rd', writeOnly: true })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword!: string;
}
