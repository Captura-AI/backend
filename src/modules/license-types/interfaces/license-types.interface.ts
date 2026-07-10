// Entities
import type { LicenseTypeEntity } from '../entities/license-type.entity';

export interface ILicenseTypesResult {
  data: LicenseTypeEntity[];
  limit: number;
  offset: number;
  total: number;
}
