import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigurationsService } from '../../../configurations/app/app-configuration.service';
import { PlateScanResponseDto } from '../dtos/plate-scan.dto';

interface IAiPlateScanResult {
  uploader_id: string;
  plates: string[];
  confidence: number | null;
  saved_result_photo: string | null;
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
      throw new ServiceUnavailableException('AI service is unavailable', {
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
      annotatedImage,
      error: scanResult.error ?? null,
    };
  }
}
