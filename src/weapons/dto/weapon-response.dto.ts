import { ApiProperty } from '@nestjs/swagger';

export class WeaponListItemDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() type: string;
  @ApiProperty() isArtifact: boolean;
}

export class WeaponWielderListItemDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class WeaponDetailDto extends WeaponListItemDto {
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({
    type: [WeaponWielderListItemDto],
    description: 'List of characters that have or had this weapon.',
  })
  wielders: WeaponWielderListItemDto[];
}
