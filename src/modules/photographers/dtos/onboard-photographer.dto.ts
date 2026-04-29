// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Class Validator
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OnboardPhotographerDto {
  @ApiProperty({ description: 'Public display name for the photographer', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  public artistName!: string;

  @ApiPropertyOptional({ description: 'Short biography', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public bio?: string;

  @ApiPropertyOptional({ description: 'Primary city / location', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  public location?: string;
}
