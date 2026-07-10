// Enums
import type { VehicleTypeEnum } from '../enums/vehicle-type.enum';
import type { TimeOfDayEnum } from '../dtos/time-filter.dto';
import type { MomentEntity } from '../entities/moments.entity';

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

export interface IMomentSearchMatch {
  isPlateMatch: boolean;
  isSemanticMatch: boolean;
  label: 'semantic' | 'plate-exact' | 'plate-fuzzy' | 'plate-partial' | 'text' | 'recent';
  score: number;
}

export interface IMomentSearchResult {
  match: IMomentSearchMatch;
  moment: MomentEntity;
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

export interface IAiAnalysisResponse {
  detected_tags: string[];
  embedding: number[] | null;
  error: string | null;
  exif: {
    camera_make: string | null;
    camera_model: string | null;
    captured_at: number | null;
    latitude: number | null;
    longitude: number | null;
  };
  license_plate: string | null;
  moment_id: string;
  motor_type: string | null;
  color: string | null;
  plate_confidence: number | null;
  processing_time_ms: number;
  vehicle_confidence: number | null;
  vehicle_type: string | null;
}

export interface ITextEmbeddingResponse {
  embedding: number[];
  model: string;
  query: string;
  vector_dimension: number;
}

// Build a scalar-only payload — TypeORM update() cannot handle relation arrays
export type MomentScalarUpdate = {
  aiAnalysis?: Record<string, unknown> | null;
  cameraInfo?: string | null;
  capturedAt?: number | null;
  color?: string | null;
  embeddingVector?: number[] | null;
  latitude?: number | null;
  licensePlate?: string | null;
  longitude?: number | null;
  motorType?: string | null;
  vehicleType?: VehicleTypeEnum | null;
};

// Shape of a single vehicle entry inside the raw ai-service `aiAnalysis`
// payload — used when sanitizing per-vehicle plate reads for public responses.
export interface IAiAnalysisVehicle {
  license_plate?: string | null;
  [key: string]: unknown;
}

// Public-safe subset of UsersEntity — moment responses must never carry a
// photographer's email, phone, or OAuth identifiers.
export interface IPublicPhotographer {
  id: string;
  name: string | null;
  avatar: string | null;
  role: string;
}
