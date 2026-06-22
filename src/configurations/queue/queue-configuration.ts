import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  host: process.env.QUEUE_REDIS_HOST,
  port: process.env.QUEUE_REDIS_PORT,
  password: process.env.QUEUE_REDIS_PASSWORD,
  aiAnalysisConcurrency: process.env.AI_ANALYSIS_CONCURRENCY,
}));
