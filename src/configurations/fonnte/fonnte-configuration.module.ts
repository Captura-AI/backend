// Configurations
import configuration from './fonnte-configuration';

// NestJS Libraries
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

// Services
import { FonnteConfigService } from './fonnte-configuration.service';

@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, FonnteConfigService],
  exports: [ConfigService, FonnteConfigService],
})
export class FonnteConfigModule {}
