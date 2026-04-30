// Class Validators
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLicenseTypeDto {
  @ApiProperty({ example: 'Editorial', maxLength: 100 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  public name!: string;

  @ApiPropertyOptional({ example: 'For non-commercial editorial use by media outlets.' })
  @IsOptional()
  @IsString()
  public description?: string;

  @ApiPropertyOptional({ example: 'Credit required. Non-commercial use only.' })
  @IsOptional()
  @IsString()
  public usageRights?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
