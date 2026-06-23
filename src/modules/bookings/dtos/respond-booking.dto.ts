// Class Validators
import { IsOptional, IsString } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RespondBookingDto {
  @ApiPropertyOptional({ description: 'Optional message to the buyer' })
  @IsOptional()
  @IsString()
  public responseMessage?: string;
}
