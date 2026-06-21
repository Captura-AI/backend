// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

// Enums
import { BookingStatusEnum } from '../enums/booking-status.enum';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListBookingsDto {
  @ApiPropertyOptional({ enum: BookingStatusEnum, description: 'Filter by booking status' })
  @IsOptional()
  @IsEnum(BookingStatusEnum)
  public status?: BookingStatusEnum;

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

  get skip(): number {
    return ((this.offset ?? 1) - 1) * (this.limit ?? 10);
  }
}
