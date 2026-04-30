// Class Transformer
import { Transform, Type } from 'class-transformer';

// Class Validators
import {
  IsArray,
  IsEnum,
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

// Enums
import { VehicleTypeEnum } from '../enums/vehicle-type.enum';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: 'JSON string array of tags, e.g. ["urban","night"]',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as string[];
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  public tags?: string[];

  @ApiPropertyOptional({ enum: VehicleTypeEnum })
  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  public vehicleType?: VehicleTypeEnum;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  public licensePlate?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'JSON string array of license objects, e.g. [{"licenseTypeId":"uuid","price":9.99}]',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as CreateMomentLicenseDto[];
      } catch {
        return value;
      }
    }
    return value;
  })
  @ValidateNested({ each: true })
  @Type(() => CreateMomentLicenseDto)
  public licenses?: CreateMomentLicenseDto[];
}
