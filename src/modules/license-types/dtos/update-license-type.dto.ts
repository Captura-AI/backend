// NestJS Libraries
import { PartialType } from '@nestjs/swagger';

// DTOs
import { CreateLicenseTypeDto } from './create-license-type.dto';

export class UpdateLicenseTypeDto extends PartialType(CreateLicenseTypeDto) {}
