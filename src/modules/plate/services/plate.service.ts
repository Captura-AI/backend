import { promises as fs } from 'fs';

import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigurationsService } from '../../../configurations/app/app-configuration.service';
import { PlateConfirmDto, PlateConfirmResponseDto } from '../dtos/plate-confirm.dto';
import { PlateScanResponseDto } from '../dtos/plate-scan.dto';

interface IAiMotorDetection {
  motor_type: string;
  motor_type_confidence: number;
  color: string | null;
  color_confidence: number | null;
  plate: string | null;
  plate_confidence: number | null;
  bbox: number[];
}

interface IAiPlateScanResult {
  uploader_id: string;
  plates: string[];
  confidence: number | null;
  motors: IAiMotorDetection[];
  saved_photo: string | null;
  saved_result_photo: string | null;
  error: string | null;
}

interface IAiPlateConfirmResult {
  uploader_id: string;
  action: string;
  success: boolean;
  message: string;
}

const AI_SERVICE_UNAVAILABLE_MESSAGE = 'AI service is unavailable';

interface IAiPlateExtractResult {
  plates: string[];
  confidence: number | null;
  motors: IAiMotorDetection[];
  error: string | null;
}

export interface IPlateExtractMotor {
  motorType: string;
  motorTypeConfidence: number;
  color: string | null;
  colorConfidence: number | null;
}

export interface IPlateExtractResult {
  plates: string[];
  confidence: number | null;
  motors: IPlateExtractMotor[];
  error: string | null;
}

@Injectable()
export class PlateService {
  constructor(private readonly _appConfig: AppConfigurationsService) {}

  public async scan(uploaderId: string, file: Express.Multer.File): Promise<PlateScanResponseDto> {
    const baseUrl = this._appConfig.aiServiceUrl;

    const formData = new FormData();
    formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

    let scanResult: IAiPlateScanResult;
    try {
      const res = await fetch(
        `${baseUrl}/plate/scan?uploader_id=${encodeURIComponent(uploaderId)}`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!res.ok) {
        throw new Error(`AI service responded with status ${res.status}`);
      }

      scanResult = (await res.json()) as IAiPlateScanResult;
    } catch (err) {
      throw new ServiceUnavailableException(AI_SERVICE_UNAVAILABLE_MESSAGE, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }

    let annotatedImage: string | null = null;
    if (scanResult.saved_result_photo) {
      try {
        const imgRes = await fetch(
          `${baseUrl}/plate/result/${encodeURIComponent(scanResult.saved_result_photo)}`,
        );
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          annotatedImage = `data:image/jpeg;base64,${Buffer.from(buffer).toString('base64')}`;
        }
      } catch {
        // Non-fatal: return plates without image
      }
    }

    return {
      uploaderId,
      plates: scanResult.plates ?? [],
      confidence: scanResult.confidence ?? null,
      motors: (scanResult.motors ?? []).map((motor) => ({
        motorType: motor.motor_type,
        motorTypeConfidence: motor.motor_type_confidence,
        color: motor.color ?? null,
        colorConfidence: motor.color_confidence ?? null,
        plate: motor.plate ?? null,
        plateConfidence: motor.plate_confidence ?? null,
      })),
      annotatedImage,
      savedPhoto: scanResult.saved_photo ?? null,
      savedResultPhoto: scanResult.saved_result_photo ?? null,
      error: scanResult.error ?? null,
    };
  }

  /**
   * Confirm a previous /plate/scan: keep ('save') or delete ('discard') the
   * scanned files and their DB records. Proxies to the AI /plate/confirm.
   */
  public async confirm(dto: PlateConfirmDto): Promise<PlateConfirmResponseDto> {
    const baseUrl = this._appConfig.aiServiceUrl;

    let result: IAiPlateConfirmResult;
    try {
      const res = await fetch(`${baseUrl}/plate/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploader_id: dto.uploaderId,
          action: dto.action,
          saved_photo_filename: dto.savedPhotoFilename ?? null,
          saved_result_photo_filename: dto.savedResultPhotoFilename ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI service responded with status ${res.status}`);
      }

      result = (await res.json()) as IAiPlateConfirmResult;
    } catch (err) {
      throw new ServiceUnavailableException(AI_SERVICE_UNAVAILABLE_MESSAGE, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }

    return {
      uploaderId: result.uploader_id,
      action: result.action,
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Stateless read of an image: plate text + motor type/color, no persistence.
   * Used by the "find my vehicle" search and by moment upload auto-tagging.
   */
  public async extract(file: Express.Multer.File): Promise<IPlateExtractResult> {
    const baseUrl = this._appConfig.aiServiceUrl;
    const bytes = await this._readFileBytes(file);

    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: file.mimetype }), file.originalname);

    let result: IAiPlateExtractResult;
    try {
      const res = await fetch(`${baseUrl}/plate/extract`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`AI service responded with status ${res.status}`);
      }

      result = (await res.json()) as IAiPlateExtractResult;
    } catch (err) {
      throw new ServiceUnavailableException(AI_SERVICE_UNAVAILABLE_MESSAGE, {
        cause: err instanceof Error ? err : new Error(String(err)),
      });
    }

    return {
      plates: result.plates ?? [],
      confidence: result.confidence ?? null,
      motors: (result.motors ?? []).map((motor) => ({
        motorType: motor.motor_type,
        motorTypeConfidence: motor.motor_type_confidence,
        color: motor.color ?? null,
        colorConfidence: motor.color_confidence ?? null,
      })),
      error: result.error ?? null,
    };
  }

  /**
   * Multer may store uploads in memory (buffer) or on disk (path) depending on
   * the route's interceptor config — read whichever is present.
   */
  private async _readFileBytes(file: Express.Multer.File): Promise<Buffer> {
    if (file.buffer) {
      return file.buffer;
    }
    if (file.path) {
      return fs.readFile(file.path);
    }
    throw new BadRequestException('Uploaded file has no readable content.');
  }
}
