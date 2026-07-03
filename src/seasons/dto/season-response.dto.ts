import { ApiProperty } from '@nestjs/swagger';
import { SeasonType } from '../enums/season-type.enum';

export class SeasonListItemDto {
  @ApiProperty() id: number;
  @ApiProperty() title: string;
  @ApiProperty({ enum: SeasonType }) type: SeasonType;
  @ApiProperty({ nullable: true }) number: number | null;
  @ApiProperty() episodesCount: number;
  @ApiProperty({ nullable: true }) releaseYear: number | null;
  @ApiProperty({ nullable: true }) mainAntagonist: string | null;
}

export class SeasonCharacterDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class SeasonWeaponDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() type: string;
}

export class SeasonLocationDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class SeasonDetailDto extends SeasonListItemDto {
  @ApiProperty({ type: [SeasonCharacterDto] })
  characters: SeasonCharacterDto[];

  @ApiProperty({ type: [SeasonWeaponDto] })
  weapons: SeasonWeaponDto[];

  @ApiProperty({ type: [SeasonLocationDto] })
  locations: SeasonLocationDto[];

  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
