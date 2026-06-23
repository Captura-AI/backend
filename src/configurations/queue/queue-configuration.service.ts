// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QueueConfigService {
  constructor(private readonly _configService: ConfigService) {}

  get queueHost(): string {
    return this._configService.get<string>('queue.host') ?? 'localhost';
  }

  get queuePort(): number {
    return Number(this._configService.get<string>('queue.port') ?? '6379');
  }

  get queuePassword(): string {
    return this._configService.get<string>('queue.password') ?? '';
  }

  /**
   * Max AI-analysis jobs processed at once. Bounds concurrent /analyze calls to
   * the single-process model service so bulk uploads queue instead of piling on.
   */
  get aiAnalysisConcurrency(): number {
    return Number(this._configService.get<string>('queue.aiAnalysisConcurrency') ?? '2');
  }
}
