// Class Validator
import { IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PhoneVerifyDto {
  @ApiProperty({ example: '08123456789' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  public phoneNumber!: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  public otp!: string;

  @ApiPropertyOptional({ example: '+62', default: '+62' })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'countryCode must be in format +62' })
  public countryCode?: string;
}
