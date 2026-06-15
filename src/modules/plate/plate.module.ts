import { Module } from '@nestjs/common';

import { AppConfigurationModule } from '../../configurations/app/app-configuration.module';
import { PlateController } from './controllers/plate.controller';
import { PlateService } from './services/plate.service';

@Module({
  controllers: [PlateController],
  exports: [PlateService],
  imports: [AppConfigurationModule],
  providers: [PlateService],
})
export class PlateModule {}
