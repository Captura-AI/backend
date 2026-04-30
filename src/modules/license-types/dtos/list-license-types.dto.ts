// Class Transformer
import { Transform, Type } from 'class-transformer';

// Class Validators
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListLicenseTypesDto {
  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  public limit?: number = 10;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  public offset?: number = 1;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  public isActive?: boolean;

  public get skip(): number {
    return ((this.offset ?? 1) - 1) * (this.limit ?? 10);
  }
}
