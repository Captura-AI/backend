// Class Validators
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class SavedSearchFilterDto {
  @ApiProperty({ description: 'Filter key, e.g. "location" / "vehicle" / "plate"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  public key!: string;

  @ApiProperty({ description: 'Short label shown on the chip, e.g. "where" / "when"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  public keyLabel!: string;

  @ApiProperty({ description: 'Display value of the filter chip' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  public value!: string;
}
