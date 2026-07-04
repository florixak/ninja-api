import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

const SORTABLE_FIELDS = ['name'] as const;

export class LocationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match on name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Realm ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  realmId?: number;

  @ApiPropertyOptional({
    description: 'Season ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  seasonId?: number;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  declare sortBy?: (typeof SORTABLE_FIELDS)[number];
}
