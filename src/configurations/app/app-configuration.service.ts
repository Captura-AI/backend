// NestJS Libraries
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

/**
 * Service dealing with app config based operations.
 *
 * @class
 */
@Injectable()
export class AppConfigurationsService {
  constructor(private readonly _configurationsService: ConfigService) {}

  /**
   * @description Define getter for get app name
   */
  get appName(): string {
    return this._configurationsService.getOrThrow<string>('app.appName');
  }

  /**
   * @description Define getter for get app host
   */
  get appHost(): string {
    return this._configurationsService.getOrThrow<string>('app.appHost');
  }

  /**
   * @description Define getter for get app port
   */
  get appPort(): number {
    return this._configurationsService.getOrThrow<number>('app.appPort');
  }

  /**
   * @description Define getter for get app environment
   */
  get appEnv(): string {
    return this._configurationsService.getOrThrow<string>('app.appEnv');
  }

  /**
   * @description Define getter for get api external base url
   */
  get apiExternalBaseUrl(): string {
    return this._configurationsService.getOrThrow<string>('app.apiExternalBaseUrl');
  }

  get corsOrigins(): string[] {
    const rawValue = this._configurationsService.get<string>('app.appCorsOrigins') ?? '';

    if (rawValue.trim().length === 0) {
      return [];
    }

    return rawValue
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  get trustProxy(): boolean {
    return this._configurationsService.getOrThrow<string>('app.appTrustProxy') === 'true';
  }

  get otelEnabled(): boolean {
    return this._configurationsService.getOrThrow<string>('app.otelEnabled') === 'true';
  }

  get otelMetricsEnabled(): boolean {
    return this._configurationsService.getOrThrow<string>('app.otelMetricsEnabled') === 'true';
  }

  get otelExportInterval(): number {
    return this._configurationsService.getOrThrow<number>('app.otelExportInterval');
  }

  get throttleTtl(): number {
    return this._configurationsService.getOrThrow<number>('app.throttleTtl');
  }

  get throttleLimit(): number {
    return this._configurationsService.getOrThrow<number>('app.throttleLimit');
  }

  get midtransServerKey(): string {
    return this._configurationsService.get<string>('app.midtransServerKey') ?? '';
  }

  get midtransClientKey(): string {
    return this._configurationsService.get<string>('app.midtransClientKey') ?? '';
  }

  get midtransIsProduction(): boolean {
    return this._configurationsService.get<string>('app.midtransIsProduction') === 'true';
  }

  get serviceFeeRate(): number {
    const raw = this._configurationsService.get<string>('app.serviceFeeRate');
    return raw ? parseFloat(raw) : 0.05;
  }

  get taxRate(): number {
    const raw = this._configurationsService.get<string>('app.taxRate');
    return raw ? parseFloat(raw) : 0.11;
  }

  get paymentExpiryMinutes(): number {
    const raw = this._configurationsService.get<string>('app.paymentExpiryMinutes');
    return raw ? parseInt(raw, 10) : 60;
  }
}
