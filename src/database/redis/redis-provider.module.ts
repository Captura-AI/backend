// IORedis
import Redis from 'ioredis';

// Modules
import { RedisConfigModule } from '../../configurations/redis/redis-configuration.module';

// NestJS Libraries
import { Module } from '@nestjs/common';

// Services
import { RedisConfigService } from '../../configurations/redis/redis-configuration.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [RedisConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (redisConfigService: RedisConfigService) => {
        return new Redis({
          host: redisConfigService.redisHost,
          lazyConnect: true,
          password: redisConfigService.redisPassword || undefined,
          port: redisConfigService.redisPort,
        });
      },
      inject: [RedisConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisProviderModule {}
