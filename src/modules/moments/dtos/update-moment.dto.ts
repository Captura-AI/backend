// Class Validators
import { IsBoolean, IsOptional } from 'class-validator';

// NestJS Libraries
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// DTOs
import { CreateMomentDto } from './create-moment.dto';

export class UpdateMomentDto extends PartialType(CreateMomentDto) {
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Set to true to publish this moment publicly, false to save as draft.',
  })
  @IsOptional()
  @IsBoolean()
  public isPublished?: boolean;
}
