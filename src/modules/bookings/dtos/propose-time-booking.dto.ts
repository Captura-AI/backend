// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProposeTimeBookingDto {
  @ApiProperty({ description: 'Counter-proposed date — Unix timestamp (seconds)' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public counterProposedDate!: number;

  @ApiPropertyOptional({ description: 'Optional message explaining the change' })
  @IsOptional()
  @IsString()
  public responseMessage?: string;
}
