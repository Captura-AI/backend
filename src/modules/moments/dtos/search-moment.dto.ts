// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// DTOs
import { MomentLocationFilterDto } from './location-filter.dto';
import { MomentTimeFilterDto } from './time-filter.dto';

// Enums
import { VehicleTypeEnum } from '../enums/vehicle-type.enum';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchMomentDto {
  @ApiPropertyOptional({
    description: 'Text search on caption and description (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  public query?: string;

  @ApiPropertyOptional({ type: () => MomentLocationFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MomentLocationFilterDto)
  public location?: MomentLocationFilterDto;

  @ApiPropertyOptional({ type: () => MomentTimeFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MomentTimeFilterDto)
  public timeRange?: MomentTimeFilterDto;

  @ApiPropertyOptional({
    isArray: true,
    enum: VehicleTypeEnum,
    description: 'Filter by one or more vehicle types',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(VehicleTypeEnum, { each: true })
  public vehicleTypes?: VehicleTypeEnum[];

  @ApiPropertyOptional({ description: 'Partial match on license plate (case-insensitive)' })
  @IsOptional()
  @IsString()
  public licensePlate?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  public limit?: number = 10;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  public offset?: number = 1;

  @ApiPropertyOptional({
    isArray: true,
    example: ['capturedAt|DESC'],
    description: "Sort fields: 'capturedAt|DESC', 'capturedAt|ASC'",
  })
  @IsOptional()
  @ValidateIf((o) => o.sortBy)
  public sortBy?: string[] = ['capturedAt|DESC'];

  get skip(): number {
    const offset = this.offset ?? 1;
    const limit = this.limit ?? 10;
    return (offset - 1) * limit;
  }
}
