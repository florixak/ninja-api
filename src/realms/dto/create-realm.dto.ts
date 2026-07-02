import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRealmDto {
  @ApiProperty({ description: 'Realm name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Realm description' })
  @IsOptional()
  @IsString()
  description?: string;
}
