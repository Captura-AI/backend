// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FonnteConfigService {
  constructor(private readonly _configService: ConfigService) {}

  get fonnteToken(): string {
    return this._configService.getOrThrow<string>('fonnte.token');
  }

  get otpChannel(): string {
    return this._configService.getOrThrow<string>('fonnte.otpChannel');
  }
}
