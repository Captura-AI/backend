// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchByPlateDto {
  @ApiPropertyOptional({
    description: 'License plate to search for. Matched fuzzily (close enough, not exact).',
    example: 'B 1234 XYZ',
  })
  @IsOptional()
  @IsString()
  public plate?: string;

  @ApiPropertyOptional({
    description: 'Motorcycle body style to boost/rank matches, e.g. Sport',
    example: 'Sport',
  })
  @IsOptional()
  @IsString()
  public motorType?: string;

  @ApiPropertyOptional({
    description: 'Vehicle color to boost/rank matches, e.g. Biru',
    example: 'Biru',
  })
  @IsOptional()
  @IsString()
  public color?: string;

  @ApiPropertyOptional({
    description: 'Minimum plate trigram similarity (0-1). Lower is more lenient.',
    minimum: 0,
    maximum: 1,
    default: 0.3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  public threshold?: number = 0.3;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  public limit?: number = 20;
}
