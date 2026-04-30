// NestJS Libraries
import { PartialType } from '@nestjs/swagger';

// DTOs
import { CreateMomentDto } from './create-moment.dto';

export class UpdateMomentDto extends PartialType(CreateMomentDto) {}
