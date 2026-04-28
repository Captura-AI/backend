// Class Validator
import { IsNotEmpty, IsString } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class MagicLinkVerifyDto {
  @ApiProperty({ description: 'Magic link token received via email' })
  @IsNotEmpty()
  @IsString()
  public token!: string;
}
