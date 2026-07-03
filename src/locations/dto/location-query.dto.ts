import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

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
  @IsNumber()
  realmId?: number;

  @ApiPropertyOptional({
    description: 'Season ID',
  })
  @IsOptional()
  @IsNumber()
  seasonId?: number;
}
