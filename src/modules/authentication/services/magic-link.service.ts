// Crypto
import * as crypto from 'crypto';

// IORedis
import type Redis from 'ioredis';

// NestJS Libraries
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

// Redis
import { REDIS_CLIENT } from '../../../database/redis/redis-provider.module';

// Services
import { MailSenderService } from './mail-sender.service';

const MAGIC_LINK_TTL_SECONDS = 900;

@Injectable()
export class MagicLinkService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly _redis: Redis,
    private readonly _mailSenderService: MailSenderService,
  ) {}

  private _buildTokenKey(token: string): string {
    return `magic:${token}`;
  }

  public async generateAndSend(email: string, baseUrl: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const key = this._buildTokenKey(token);

    await this._redis.setex(key, MAGIC_LINK_TTL_SECONDS, email);

    const magicLink = `${baseUrl}?token=${token}`;
    await this._mailSenderService.sendMagicLink(email, magicLink);
  }

  public async verify(token: string): Promise<string> {
    const key = this._buildTokenKey(token);
    const email = await this._redis.get(key);

    if (!email) {
      throw new BadRequestException('Bad Request', {
        cause: new Error(),
        description: 'Invalid or expired magic link token.',
      });
    }

    await this._redis.del(key);

    return email;
  }
}
