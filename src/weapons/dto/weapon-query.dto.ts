import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export const SORTABLE_FIELDS = ['name', 'type', 'isArtifact'] as const;

export class WeaponQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match on name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match on type',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Whether the weapon is an artifact',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean;
  })
  @IsBoolean()
  isArtifact?: boolean;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  declare sortBy?: (typeof SORTABLE_FIELDS)[number];
}
