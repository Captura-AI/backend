// Class Validators
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

export class BulkMomentActionDto {
  @ApiProperty({
    type: [String],
    description: 'Array of moment IDs to act on. Min 1, max 100.',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  public momentIds!: string[];
}
