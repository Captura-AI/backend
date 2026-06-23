import type { JobsOptions } from 'bullmq';

/**
 * Redis-backed queue that throttles AI analysis so bulk uploads can't overload
 * the single-process model service. Producers (photographer upload) enqueue a
 * job; a single worker drains it at a bounded concurrency (see the processor).
 */
export const AI_ANALYSIS_QUEUE = 'ai-analysis';
export const AI_ANALYSIS_JOB = 'analyze-moment';

export interface IAiAnalysisJob {
  imageUrl: string;
  momentId: string;
}

// Retry transient failures (AI service briefly unreachable / 5xx) with exponential
// backoff. Completed jobs are dropped; the last failures are kept for inspection.
export const AI_ANALYSIS_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { delay: 5_000, type: 'exponential' },
  removeOnComplete: true,
  removeOnFail: 100,
};
