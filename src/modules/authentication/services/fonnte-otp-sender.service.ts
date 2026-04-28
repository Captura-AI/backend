// Interfaces
import type { IOtpSender } from '../interfaces/otp-sender.interface';

// NestJS Libraries
import { Injectable, Logger } from '@nestjs/common';

// Services
import { FonnteConfigService } from '../../../configurations/fonnte/fonnte-configuration.service';

@Injectable()
export class FonnteOtpSenderService implements IOtpSender {
  private readonly _logger = new Logger(FonnteOtpSenderService.name);
  private readonly _baseUrl = 'https://api.fonnte.com/send';

  constructor(private readonly _fonnteConfigService: FonnteConfigService) {}

  public async send(to: string, message: string): Promise<void> {
    const channel = this._fonnteConfigService.otpChannel;
    const token = this._fonnteConfigService.fonnteToken;

    const body = new URLSearchParams({
      countryCode: '62',
      message,
      target: to,
      ...(channel === 'whatsapp' ? { typing: 'false', delay: '0' } : {}),
    });

    const response = await fetch(this._baseUrl, {
      body,
      headers: {
        Authorization: token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });

    const responseData = (await response.json()) as {
      status: boolean;
      reason?: string;
      id?: string;
    };

    if (!response.ok || !responseData.status) {
      const reason = responseData.reason ?? `HTTP ${response.status}`;
      this._logger.error(`[ERROR] Fonnte send failed: ${reason}`);
      throw new Error(`OTP delivery failed via Fonnte: ${reason}`);
    }

    this._logger.log(`[INFO] OTP sent to ${to} via ${channel} (id: ${responseData.id ?? 'n/a'})`);
  }
}
