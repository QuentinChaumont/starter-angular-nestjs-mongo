import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

/** `null` is a meaningful value here ("clear this setting"), so each field
 * is `@IsOptional()` (absent ⇒ unchanged) and additionally allows an
 * explicit `null`. The cross-field rule (warning < retention) is enforced
 * in `AppSettingsService.update` against the merged result. */
class AccountRetentionPatchDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  inactiveDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  warningDays?: number | null;
}

export class UpdateSettingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountRetentionPatchDto)
  accountRetention?: AccountRetentionPatchDto;
}
