import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import type {
  ConfirmTwoFactorRequest,
  DisableTwoFactorRequest,
  VerifyTwoFactorRequest,
} from '@org/shared-contracts';

export class ConfirmTwoFactorDto implements ConfirmTwoFactorRequest {
  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;
}

export class VerifyTwoFactorDto implements VerifyTwoFactorRequest {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  pendingToken!: string;

  @ApiProperty({ example: '123456', description: 'TOTP code or a backup code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;
}

export class DisableTwoFactorDto implements DisableTwoFactorRequest {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
