// Configurations
import configuration from './apple-configuration';

// NestJS Libraries
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

// Services
import { AppleConfigService } from './apple-configuration.service';

@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, AppleConfigService],
  exports: [ConfigService, AppleConfigService],
})
export class AppleConfigModule {}
