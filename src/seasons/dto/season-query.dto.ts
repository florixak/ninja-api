import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SeasonType } from '../enums/season-type.enum';

const SORTABLE_FIELDS = ['title', 'type', 'number', 'releaseYear'] as const;

export class SeasonQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Partial, case-insensitive match on title',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    enum: SeasonType,
    description: 'Season type',
  })
  @IsOptional()
  @IsEnum(SeasonType, {
    message: `type must be one of: ${Object.values(SeasonType).join(', ')}`,
  })
  type?: SeasonType;

  @ApiPropertyOptional({
    description: 'Season number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'number must be an integer' })
  @Min(0, { message: 'number must be at least 0' })
  @Max(999, { message: 'number must not exceed 999' })
  number?: number;

  @ApiPropertyOptional({
    description: 'Season release year',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'releaseYear must be an integer' })
  @Min(2011, { message: 'releaseYear must be at least 2011' })
  @Max(2100, { message: 'releaseYear must not exceed 2100' })
  releaseYear?: number;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'title' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS, {
    message: `sortBy must be one of: ${SORTABLE_FIELDS.join(', ')}`,
  })
  declare sortBy?: (typeof SORTABLE_FIELDS)[number];
}
