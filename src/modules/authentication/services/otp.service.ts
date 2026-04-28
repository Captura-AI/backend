// Crypto
import * as crypto from 'crypto';

// Interfaces
import type { IOtpSender } from '../interfaces/otp-sender.interface';
import { OTP_SENDER } from '../interfaces/otp-sender.interface';

// IORedis
import type Redis from 'ioredis';

// NestJS Libraries
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

// Redis
import { REDIS_CLIENT } from '../../../database/redis/redis-provider.module';

const OTP_TTL_SECONDS = 300;
const OTP_ATTEMPTS_TTL_SECONDS = 3600;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly _redis: Redis,
    @Inject(OTP_SENDER)
    private readonly _otpSender: IOtpSender,
  ) {}

  private _buildOtpKey(phoneNumber: string): string {
    return `otp:phone:${phoneNumber}`;
  }

  private _buildAttemptsKey(phoneNumber: string): string {
    return `otp:attempts:${phoneNumber}`;
  }

  public async generateAndSend(phoneNumber: string): Promise<void> {
    const attemptsKey = this._buildAttemptsKey(phoneNumber);
    const attempts = await this._redis.incr(attemptsKey);

    if (attempts === 1) {
      await this._redis.expire(attemptsKey, OTP_ATTEMPTS_TTL_SECONDS);
    }

    if (attempts > OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Bad Request', {
        cause: new Error(),
        description: 'Too many OTP requests. Please try again later.',
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpKey = this._buildOtpKey(phoneNumber);

    await this._redis.setex(otpKey, OTP_TTL_SECONDS, otp);

    const message = `Kode OTP Captura Anda adalah: *${otp}*\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`;

    await this._otpSender.send(phoneNumber, message);
  }

  public async verify(phoneNumber: string, otp: string): Promise<boolean> {
    const otpKey = this._buildOtpKey(phoneNumber);
    const stored = await this._redis.get(otpKey);

    if (!stored || stored !== otp) {
      return false;
    }

    await this._redis.del(otpKey);
    await this._redis.del(this._buildAttemptsKey(phoneNumber));

    return true;
  }
}
