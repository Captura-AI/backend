// NestJS Libraries
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Class Validators
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BillingInfoDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  public email!: string;

  @ApiProperty({ example: 'Budi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public firstName!: string;

  @ApiProperty({ example: 'Santoso' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  public lastName!: string;

  @ApiPropertyOptional({ example: '08123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  public phone?: string;

  @ApiPropertyOptional({ example: 'ID' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  public country?: string;
}
