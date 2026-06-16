// Class Validators
import { IsNotEmpty, IsUUID } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class CreateSavedMomentDto {
  @ApiProperty({ description: 'ID of the moment to bookmark', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  public momentId!: string;
}
