// Gateways
import type { MomentsGateway } from '../gateways/moments.gateway';

// NestJS Libraries
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Configuration
import { AppConfigurationsService } from '../../../configurations/app/app-configuration.service';

// Entities
import { MomentEntity } from '../entities/moments.entity';

// Helpers
import { buildAutoFillFields } from '../helpers/ai-analysis.helper';

// Interfaces
import type {
  IAiAnalysisResponse,
  ITextEmbeddingResponse,
  MomentScalarUpdate,
} from '../interfaces/moments.interface';

// TypeORM
import { Repository } from 'typeorm';

type MomentUpdateCriteria = Parameters<Repository<MomentEntity>['update']>[0];
type MomentUpdatePayload = Parameters<Repository<MomentEntity>['update']>[1];

@Injectable()
export class AiAnalysisService {
  private readonly _logger = new Logger(AiAnalysisService.name);

  constructor(
    @InjectRepository(MomentEntity)
    private readonly _momentRepository: Repository<MomentEntity>,
    private readonly _config: AppConfigurationsService,
    @Optional() private readonly _momentsGateway?: MomentsGateway,
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

    const status = data.error ? 'failed' : 'ready';

    if (moment.photographerId) {
      this._momentsGateway?.emitMomentAnalyzed(moment.photographerId, momentId, status);
    }
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
