// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleConfigService {
  constructor(private readonly _configService: ConfigService) {}

  get appleCallbackUrl(): string {
    return this._configService.get<string>('apple.callbackUrl') ?? '';
  }

  get appleClientId(): string {
    return this._configService.get<string>('apple.clientId') ?? '';
  }

  get appleKeyId(): string {
    return this._configService.get<string>('apple.keyId') ?? '';
  }

  get applePrivateKey(): string {
    return this._configService.get<string>('apple.privateKey') ?? '';
  }

  get appleTeamId(): string {
    return this._configService.get<string>('apple.teamId') ?? '';
  }
}
