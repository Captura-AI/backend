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

// Queue
import { BullModule } from '@nestjs/bullmq';
import { AI_ANALYSIS_QUEUE } from './queues/ai-analysis.queue';
import { AiAnalysisProcessor } from './queues/ai-analysis.processor';

// Services
import { AiAnalysisService } from './services/ai-analysis.service';
import { MomentsService } from './services/moments.service';

@Module({
  controllers: [MomentsController],
  exports: [MomentsService],
  imports: [
    TypeOrmModule.forFeature([MomentCollaboratorEntity, MomentEntity, MomentLicenseEntity]),
    BullModule.registerQueue({ name: AI_ANALYSIS_QUEUE }),
    AppConfigurationModule,
    PlateModule,
  ],
  providers: [AiAnalysisProcessor, AiAnalysisService, MomentsService],
})
export class MomentsModule {}
