// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// DTOs
import { SavedSearchFilterDto } from './saved-search-filter.dto';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const MAX_FILTERS = 12;

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Human-readable label for the saved search' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  public label!: string;

  @ApiPropertyOptional({ description: 'Short description of what was saved' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  public summary?: string;

  @ApiPropertyOptional({ description: 'Free-text query string' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  public query?: string;

  @ApiPropertyOptional({ type: [SavedSearchFilterDto], description: 'Active filter chips' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_FILTERS)
  @ValidateNested({ each: true })
  @Type(() => SavedSearchFilterDto)
  public filters?: SavedSearchFilterDto[];

  @ApiPropertyOptional({ description: 'Result count snapshot at save time', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  public resultCount?: number;
}
