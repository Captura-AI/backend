// Class Validator
import { IsNotEmpty } from 'class-validator';

// Interfaces
import type { IAuthTokens } from '../interfaces/authentication.interface';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class LoginUsernameDto {
  @ApiProperty()
  @IsNotEmpty()
  public username!: string;

  @ApiProperty()
  @IsNotEmpty()
  public password!: string;
}

export class LoginWithAccessToken implements IAuthTokens {
  @ApiProperty()
  public accessToken!: string;

  @ApiProperty()
  public refreshToken!: string;
}
