// NestJS Libraries
import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';

// Queue
import { AI_ANALYSIS_QUEUE, IAiAnalysisJob } from './ai-analysis.queue';

// Services
import { AiAnalysisService } from '../services/ai-analysis.service';

// BullMQ
import type { Job } from 'bullmq';

/**
 * Drains the AI-analysis queue at a bounded concurrency so however many photos
 * are uploaded at once, only `AI_ANALYSIS_CONCURRENCY` reach the model service
 * simultaneously. Errors thrown here are retried by BullMQ per the job options.
 *
 * BullMQ needs the concurrency at decoration time, so it is read from the env
 * directly (mirrors queue.aiAnalysisConcurrency); default 2.
 */
@Processor(AI_ANALYSIS_QUEUE, {
  concurrency: Number(process.env.AI_ANALYSIS_CONCURRENCY ?? '2'),
})
export class AiAnalysisProcessor extends WorkerHost {
  private readonly _logger = new Logger(AiAnalysisProcessor.name);

  constructor(private readonly _aiAnalysisService: AiAnalysisService) {
    super();
  }

  async process(job: Job<IAiAnalysisJob>): Promise<void> {
    const { imageUrl, momentId } = job.data;
    this._logger.log(
      `Processing AI analysis for moment ${momentId} (attempt ${job.attemptsMade + 1})`,
    );
    await this._aiAnalysisService.analyzeMoment(momentId, imageUrl);
  }
}
