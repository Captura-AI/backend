// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMomentLicenseDto {
  @ApiProperty({ description: 'ID of the license type selected from the platform master list' })
  @IsNotEmpty()
  @IsUUID()
  public licenseTypeId!: string;

  @ApiProperty({ example: 29.99, description: 'Photographer-set price for this license type' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  public price!: number;

  @ApiPropertyOptional({ example: 'USD', maxLength: 10, default: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  public currency?: string = 'USD';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  public isActive?: boolean = true;
}
