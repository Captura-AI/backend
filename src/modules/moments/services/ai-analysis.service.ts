// NestJS Libraries
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Configuration
import { AppConfigurationsService } from '../../../configurations/app/app-configuration.service';

// Entities
import { MomentEntity } from '../entities/moments.entity';
import { VehicleTypeEnum } from '../enums/vehicle-type.enum';

// TypeORM
import { Repository } from 'typeorm';

interface IAiAnalysisResponse {
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

interface ITextEmbeddingResponse {
  embedding: number[];
  model: string;
  query: string;
  vector_dimension: number;
}

// Build a scalar-only payload — TypeORM update() cannot handle relation arrays
type MomentScalarUpdate = {
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

type MomentUpdateCriteria = Parameters<Repository<MomentEntity>['update']>[0];
type MomentUpdatePayload = Parameters<Repository<MomentEntity>['update']>[1];

const VEHICLE_TYPE_MAP: Record<string, VehicleTypeEnum> = {
  BICYCLE: VehicleTypeEnum.BICYCLE,
  BUS: VehicleTypeEnum.BUS,
  CAR: VehicleTypeEnum.CAR,
  MOTORCYCLE: VehicleTypeEnum.MOTORCYCLE,
  TRUCK: VehicleTypeEnum.TRUCK,
};

function buildAutoFillFields(moment: MomentEntity, data: IAiAnalysisResponse): MomentScalarUpdate {
  const fields: MomentScalarUpdate = {};

  // Only fill a column the photographer left empty, and only with a real value
  // (empty string / null are treated as "no value"). Kept as one helper so the
  // per-field rules stay flat and cognitive complexity low.
  const fill = <K extends keyof MomentScalarUpdate>(
    key: K,
    current: string | number | null | undefined,
    next: MomentScalarUpdate[K] | null | undefined,
  ): void => {
    const isEmpty = current == null || current === '';
    if (isEmpty && next != null && next !== '') {
      // `key` is a compile-time `keyof MomentScalarUpdate` literal, not user input —
      // safe despite the generic object-injection rule.
      // eslint-disable-next-line security/detect-object-injection
      fields[key] = next as MomentScalarUpdate[K];
    }
  };

  let vehicleType: VehicleTypeEnum | null = null;
  if (data.vehicle_type) {
    vehicleType = VEHICLE_TYPE_MAP[data.vehicle_type] ?? VehicleTypeEnum.OTHER;
  }

  let cameraInfo: string | null = null;
  if (data.exif?.camera_model) {
    const make = data.exif.camera_make ? `${data.exif.camera_make} ` : '';
    cameraInfo = `${make}${data.exif.camera_model}`.trim();
  }

  fill('vehicleType', moment.vehicleType, vehicleType);
  fill('licensePlate', moment.licensePlate, data.license_plate);
  fill('motorType', moment.motorType, data.motor_type);
  fill('color', moment.color, data.color);
  fill('latitude', moment.latitude, data.exif?.latitude);
  fill('longitude', moment.longitude, data.exif?.longitude);
  fill('capturedAt', moment.capturedAt, data.exif?.captured_at);
  fill('cameraInfo', moment.cameraInfo, cameraInfo);

  return fields;
}

@Injectable()
export class AiAnalysisService {
  private readonly _logger = new Logger(AiAnalysisService.name);

  constructor(
    @InjectRepository(MomentEntity)
    private readonly _momentRepository: Repository<MomentEntity>,
    private readonly _config: AppConfigurationsService,
  ) {}

  /** Headers for AI-service calls, including the API key when one is configured. */
  private _aiHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = this._config.aiServiceApiKey;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    return headers;
  }

  /**
   * Runs AI analysis for one moment and persists the result. Called by the
   * queue worker — transient failures (AI service unreachable / 5xx) throw so
   * BullMQ retries them; a missing moment returns quietly (nothing to retry).
   */
  public async analyzeMoment(momentId: string, imageUrl: string): Promise<void> {
    const data = await this._callAiService(momentId, imageUrl);

    const moment = await this._momentRepository.findOne({ where: { id: momentId } });
    if (!moment) {
      this._logger.warn(`Moment ${momentId} no longer exists; skipping AI analysis.`);
      return;
    }

    const updatePayload: MomentScalarUpdate = {
      aiAnalysis: data as unknown as Record<string, unknown>,
      embeddingVector: data.embedding ?? null,
      ...buildAutoFillFields(moment, data),
    };

    await this._momentRepository.update(
      momentId as MomentUpdateCriteria,
      updatePayload as MomentUpdatePayload,
    );

    this._logger.log(`AI analysis complete for moment ${momentId} in ${data.processing_time_ms}ms`);
  }

  private async _callAiService(momentId: string, imageUrl: string): Promise<IAiAnalysisResponse> {
    let response: Response;

    // Ensure the AI service receives an absolute HTTP URL — locally-served uploads
    // are stored as relative paths (e.g. uploads/moments/...) and must be prefixed
    // with the external base URL so the Python service can fetch them.
    const absoluteImageUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `${this._config.apiExternalBaseUrl.replace(/\/$/, '')}/${imageUrl}`;

    try {
      response = await fetch(`${this._config.aiServiceUrl}/analyze`, {
        body: JSON.stringify({ image_url: absoluteImageUrl, moment_id: momentId }),
        headers: this._aiHeaders(),
        method: 'POST',
      });
    } catch (err) {
      // Rethrow so the queue retries — the AI service may just be momentarily down.
      throw new Error(`AI service unreachable for moment ${momentId}: ${err}`);
    }

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status} for moment ${momentId}`);
    }

    return (await response.json()) as IAiAnalysisResponse;
  }

  public async embedTextQuery(query: string): Promise<number[] | null> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return null;
    }

    let response: Response;

    try {
      response = await fetch(`${this._config.aiServiceUrl}/embed/text`, {
        body: JSON.stringify({ query: normalizedQuery }),
        headers: this._aiHeaders(),
        method: 'POST',
      });
    } catch (err) {
      this._logger.warn(`AI text embedding service unreachable: ${err}`);
      return null;
    }

    if (!response.ok) {
      this._logger.warn(`AI text embedding service returned ${response.status}`);
      return null;
    }

    const data = (await response.json()) as ITextEmbeddingResponse;

    if (data.vector_dimension !== 512 || data.embedding.length !== 512) {
      this._logger.warn(`AI text embedding returned invalid dimension ${data.vector_dimension}`);
      return null;
    }

    return data.embedding;
  }
}
