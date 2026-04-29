// Controllers
import { MomentsController } from './controllers/moments.controller';

// Entities
import { MomentCollaboratorEntity } from './entities/moment-collaborator.entity';
import { MomentEntity } from './entities/moments.entity';
import { MomentLicenseEntity } from './entities/moment-license.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { MomentsService } from './services/moments.service';

@Module({
  controllers: [MomentsController],
  exports: [MomentsService],
  imports: [
    TypeOrmModule.forFeature([MomentCollaboratorEntity, MomentEntity, MomentLicenseEntity]),
  ],
  providers: [MomentsService],
})
export class MomentsModule {}
