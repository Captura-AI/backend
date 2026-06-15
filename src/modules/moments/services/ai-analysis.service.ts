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
  plate_confidence: number | null;
  processing_time_ms: number;
  vehicle_confidence: number | null;
  vehicle_type: string | null;
}

// Build a scalar-only payload — TypeORM update() cannot handle relation arrays
type MomentScalarUpdate = {
  aiAnalysis?: Record<string, unknown> | null;
  cameraInfo?: string | null;
  capturedAt?: number | null;
  embeddingVector?: number[] | null;
  latitude?: number | null;
  licensePlate?: string | null;
  longitude?: number | null;
  vehicleType?: VehicleTypeEnum | null;
};

const VEHICLE_TYPE_MAP: Record<string, VehicleTypeEnum> = {
  BICYCLE: VehicleTypeEnum.BICYCLE,
  BUS: VehicleTypeEnum.BUS,
  CAR: VehicleTypeEnum.CAR,
  MOTORCYCLE: VehicleTypeEnum.MOTORCYCLE,
  TRUCK: VehicleTypeEnum.TRUCK,
};

function buildAutoFillFields(moment: MomentEntity, data: IAiAnalysisResponse): MomentScalarUpdate {
  const fields: MomentScalarUpdate = {};

  if (!moment.vehicleType && data.vehicle_type) {
    fields.vehicleType = VEHICLE_TYPE_MAP[data.vehicle_type] ?? VehicleTypeEnum.OTHER;
  }
  if (!moment.licensePlate && data.license_plate) {
    fields.licensePlate = data.license_plate;
  }
  if (moment.latitude == null && data.exif?.latitude != null) {
    fields.latitude = data.exif.latitude;
  }
  if (moment.longitude == null && data.exif?.longitude != null) {
    fields.longitude = data.exif.longitude;
  }
  if (moment.capturedAt == null && data.exif?.captured_at != null) {
    fields.capturedAt = data.exif.captured_at;
  }
  if (!moment.cameraInfo && data.exif?.camera_model) {
    const make = data.exif.camera_make ? `${data.exif.camera_make} ` : '';
    fields.cameraInfo = `${make}${data.exif.camera_model}`.trim();
  }

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

  public async analyzeMoment(momentId: string, imageUrl: string): Promise<void> {
    try {
      const data = await this._callAiService(momentId, imageUrl);
      if (!data) return;

      const moment = await this._momentRepository.findOne({ where: { id: momentId } });
      if (!moment) return;

      const updatePayload: MomentScalarUpdate = {
        aiAnalysis: data as unknown as Record<string, unknown>,
        embeddingVector: data.embedding ?? null,
        ...buildAutoFillFields(moment, data),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this._momentRepository.update(momentId, updatePayload as any);

      this._logger.log(
        `AI analysis complete for moment ${momentId} in ${data.processing_time_ms}ms`,
      );
    } catch (err) {
      this._logger.warn(`AI analysis failed for moment ${momentId}: ${err}`);
    }
  }

  private async _callAiService(
    momentId: string,
    imageUrl: string,
  ): Promise<IAiAnalysisResponse | null> {
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
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    } catch (err) {
      this._logger.warn(`AI service unreachable for moment ${momentId}: ${err}`);
      return null;
    }

    if (!response.ok) {
      this._logger.warn(`AI service returned ${response.status} for moment ${momentId}`);
      return null;
    }

    return (await response.json()) as IAiAnalysisResponse;
  }
}
