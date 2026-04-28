// Configurations
import configuration from './google-configuration';

// NestJS Libraries
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

// Services
import { GoogleConfigService } from './google-configuration.service';

@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, GoogleConfigService],
  exports: [ConfigService, GoogleConfigService],
})
export class GoogleConfigModule {}
