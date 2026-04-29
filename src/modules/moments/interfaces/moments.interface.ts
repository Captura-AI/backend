// Enums
import type { VehicleTypeEnum } from '../enums/vehicle-type.enum';
import type { TimeOfDayEnum } from '../dtos/time-filter.dto';

export interface IMomentLocationFilter {
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface IMomentTimeFilter {
  from?: number;
  to?: number;
  timeOfDay?: TimeOfDayEnum;
}

export interface IMomentSearchFilters {
  query?: string;
  location?: IMomentLocationFilter;
  timeRange?: IMomentTimeFilter;
  vehicleTypes?: VehicleTypeEnum[];
  licensePlate?: string;
  limit?: number;
  offset?: number;
  sortBy?: string[];
}

export interface IMomentFacetItem {
  label: string;
  count: number;
}

export interface IMomentFacets {
  cities: IMomentFacetItem[];
  vehicleTypes: IMomentFacetItem[];
}

// Placeholder interface for Phase 2 AI analysis results (populated via gRPC from Python AI Service)
export interface IMomentAiAnalysis {
  colorAnalysis?: unknown;
  mood?: unknown;
  objectDetection?: unknown;
  personAttributes?: unknown;
}

export interface IPhotographerSummary {
  id: string;
  artistName: string;
  bio: string | null;
  location: string | null;
  avatar: string | null;
  totalMoments: number;
}
