import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ElementListItemDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}

export class ElementMasterListItemDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty({
    description: 'Whether the character is the current master of the element',
  })
  isActive: boolean;
}

export class ElementDetailDto extends ElementListItemDto {
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'The elemental power of fire...',
  })
  description: string | null;
  @ApiProperty({
    type: [ElementMasterListItemDto],
    description:
      'List of element masters that have this element or had it in the past',
  })
  masters: ElementMasterListItemDto[];
}
