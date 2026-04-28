// Class Validator
import { IsEmail, IsNotEmpty } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class MagicLinkInitDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  public email!: string;
}
