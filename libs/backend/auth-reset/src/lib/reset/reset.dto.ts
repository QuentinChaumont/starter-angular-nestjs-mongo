import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '@org/shared-contracts';

const MIN_PASSWORD_LENGTH = 8;

export class ForgotPasswordDto implements ForgotPasswordRequest {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto implements ResetPasswordRequest {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ example: 'Str0ng!Passw0rd', writeOnly: true })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;
}

export class VerifyEmailDto implements VerifyEmailRequest {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token!: string;
}
