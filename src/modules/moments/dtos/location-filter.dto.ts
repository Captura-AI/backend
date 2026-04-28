// Class Validators
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

// Type
import { Type } from 'class-transformer';

export class MomentLocationFilterDto {
  @ApiPropertyOptional({ description: 'Filter by city name (case-insensitive partial match)' })
  @IsOptional()
  @IsString()
  public city?: string;

  @ApiPropertyOptional({ description: 'Filter by district name (case-insensitive partial match)' })
  @IsOptional()
  @IsString()
  public district?: string;

  @ApiPropertyOptional({ description: 'Latitude for radius search (Phase 2)' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  public latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude for radius search (Phase 2)' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  public longitude?: number;

  @ApiPropertyOptional({
    description: 'Radius in kilometers for geo-search (Phase 2 with PostGIS)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  public radiusKm?: number;
}
