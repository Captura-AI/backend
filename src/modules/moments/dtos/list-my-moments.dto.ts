// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListMyMomentsDto {
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
    description: 'Filter moments captured on or after this Unix timestamp (seconds, UTC)',
    example: 1750521600,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public startDate?: number;

  @ApiPropertyOptional({
    description: 'Filter moments captured on or before this Unix timestamp (seconds, UTC)',
    example: 1750607999,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public endDate?: number;

  get skip(): number {
    const offset = this.offset ?? 1;
    const limit = this.limit ?? 10;
    return (offset - 1) * limit;
  }
}
