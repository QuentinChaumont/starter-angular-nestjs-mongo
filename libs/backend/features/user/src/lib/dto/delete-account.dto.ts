import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import type { DeleteAccountRequest } from '@org/shared-contracts';

/** Body of `DELETE /users/me` — re-confirm the password before wiping the
 * account for good. */
export class DeleteAccountDto implements DeleteAccountRequest {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
