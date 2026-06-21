// Class Transformer
import { Type } from 'class-transformer';

// Class Validators
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID of the photographer profile to book' })
  @IsUUID()
  public photographerProfileId!: string;

  @ApiPropertyOptional({ description: 'ID of the specific package to book (optional)' })
  @IsOptional()
  @IsUUID()
  public packageId?: string;

  @ApiProperty({ description: 'Proposed session date — Unix timestamp (seconds)' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  public proposedDate!: number;

  @ApiPropertyOptional({ description: 'Session location or area' })
  @IsOptional()
  @IsString()
  public location?: string;

  @ApiPropertyOptional({ description: 'Message to the photographer' })
  @IsOptional()
  @IsString()
  public message?: string;
}
