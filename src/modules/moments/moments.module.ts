// Controllers
import { MomentsController } from './controllers/moments.controller';

// Entities
import { MomentCollaboratorEntity } from './entities/moment-collaborator.entity';
import { MomentEntity } from './entities/moments.entity';
import { MomentLicenseEntity } from './entities/moment-license.entity';

// Modules
import { AppConfigurationModule } from '../../configurations/app/app-configuration.module';
import { PlateModule } from '../plate/plate.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { AiAnalysisService } from './services/ai-analysis.service';
import { MomentsService } from './services/moments.service';

@Module({
  controllers: [MomentsController],
  exports: [MomentsService],
  imports: [
    TypeOrmModule.forFeature([MomentCollaboratorEntity, MomentEntity, MomentLicenseEntity]),
    AppConfigurationModule,
    PlateModule,
  ],
  providers: [AiAnalysisService, MomentsService],
})
export class MomentsModule {}
