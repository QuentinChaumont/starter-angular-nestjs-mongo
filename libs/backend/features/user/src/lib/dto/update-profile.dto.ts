import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { UpdateProfileRequest } from '@org/shared-contracts';

/** Languages the shipped `frontend-i18n` brick bundles (V2.3 step 47). */
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;

/** Body of `PATCH /users/me`. Changing `email` clears its verified status. */
export class UpdateProfileDto implements UpdateProfileRequest {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ example: 'jane.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'fr', enum: SUPPORTED_LOCALES })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}
