// Class Validator
import { IsNotEmpty, IsString } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  public refreshToken!: string;
}
