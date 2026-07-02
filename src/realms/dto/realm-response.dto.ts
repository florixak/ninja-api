import { ApiProperty } from '@nestjs/swagger';

export class RealmListItemDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class RealmDetailDto extends RealmListItemDto {}
