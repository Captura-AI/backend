// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleConfigService {
  constructor(private readonly _configService: ConfigService) {}

  get googleCallbackUrl(): string {
    return this._configService.get<string>('google.callbackUrl') ?? '';
  }

  get googleClientId(): string {
    return this._configService.get<string>('google.clientId') ?? '';
  }

  get googleClientSecret(): string {
    return this._configService.get<string>('google.clientSecret') ?? '';
  }
}
