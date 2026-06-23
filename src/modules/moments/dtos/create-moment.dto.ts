// Class Transformer
import { Transform, Type } from 'class-transformer';

// Class Validators
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// DTOs
import { CreateMomentLicenseDto } from './create-moment-license.dto';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Coerce a multipart form value into a string[] for lenient uploads: accepts an
 * actual array, a JSON array string, or a comma-separated list; empty/blank
 * values become undefined so the optional field validates instead of 400-ing.
 */
function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value as string[];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    } catch {
      // Not JSON — treat as a comma-separated list.
    }
    return trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return undefined;
}

/**
 * Coerce a multipart form value into an object[] for lenient uploads: accepts an
 * actual array or a JSON array string; anything else (blank, malformed) becomes
 * undefined so the optional field validates instead of 400-ing.
 */
function normalizeObjectArray(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export class CreateMomentDto {
  @ApiProperty({ description: 'Short caption for the moment' })
  @IsNotEmpty()
  @IsString()
  public caption!: string;

  @ApiPropertyOptional({ description: 'Extended narrative about this moment' })
  @IsOptional()
  @IsString()
  public story?: string;

  @ApiPropertyOptional({ description: 'Unix timestamp (seconds) when the photo was taken' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public capturedAt?: number;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public city?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public district?: string;

  @ApiPropertyOptional({ description: 'Decimal latitude coordinate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  public latitude?: number;

  @ApiPropertyOptional({ description: 'Decimal longitude coordinate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  public longitude?: number;

  @ApiPropertyOptional({ description: 'Camera model and settings used', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  public cameraInfo?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'JSON string array (["urban","night"]) or a comma-separated list. Optional.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeStringArray(value))
  @IsArray()
  @IsString({ each: true })
  public tags?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'Free-form vehicle type, e.g. "motorcycle". Optional; not restricted to an enum.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  public vehicleType?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  public licensePlate?: string;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description:
      'Auto-approve the AI plate scan so its results are kept automatically. ' +
      'When false, the scan artifacts are discarded (the moment is still created). Defaults to true.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value;
  })
  @IsBoolean()
  public autoApprove?: boolean;

  @ApiPropertyOptional({
    type: String,
    description:
      'JSON string array of license objects, e.g. [{"licenseTypeId":"uuid","price":9.99}]. Optional.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeObjectArray(value))
  @ValidateNested({ each: true })
  @Type(() => CreateMomentLicenseDto)
  public licenses?: CreateMomentLicenseDto[];
}
