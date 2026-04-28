// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeOfDayEnum {
  AFTERNOON = 'afternoon',
  GOLDEN_HOUR = 'golden_hour',
  MORNING = 'morning',
  NIGHT = 'night',
}

export const TIME_OF_DAY_HOURS: Record<TimeOfDayEnum, { end: number; start: number }> = {
  [TimeOfDayEnum.AFTERNOON]: { end: 16, start: 10 },
  [TimeOfDayEnum.GOLDEN_HOUR]: { end: 19, start: 16 },
  [TimeOfDayEnum.MORNING]: { end: 10, start: 5 },
  [TimeOfDayEnum.NIGHT]: { end: 29, start: 19 }, // 29 = 5 next day (wraps past midnight)
};

export class MomentTimeFilterDto {
  @ApiPropertyOptional({ description: 'Start Unix timestamp (inclusive)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public from?: number;

  @ApiPropertyOptional({ description: 'End Unix timestamp (inclusive)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public to?: number;

  @ApiPropertyOptional({
    enum: TimeOfDayEnum,
    description:
      'Filter by time of day: morning (5-10h), afternoon (10-16h), golden_hour (16-19h), night (19-5h)',
  })
  @IsOptional()
  @IsEnum(TimeOfDayEnum)
  public timeOfDay?: TimeOfDayEnum;
}
