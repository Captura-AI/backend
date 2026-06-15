// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPhotographersDto {
  @ApiPropertyOptional({ description: 'Filter by city/location text' })
  @IsOptional()
  @IsString()
  public location?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  public limit?: number = 12;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  public offset?: number = 1;

  get skip(): number {
    const offset = this.offset ?? 1;
    const limit = this.limit ?? 12;

    return (offset - 1) * limit;
  }
}
