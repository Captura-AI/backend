// Class Validator
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PhoneInitDto {
  @ApiProperty({ example: '08123456789' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  public phoneNumber!: string;

  @ApiPropertyOptional({ example: '+62', default: '+62' })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'countryCode must be in format +62' })
  public countryCode?: string;
}
