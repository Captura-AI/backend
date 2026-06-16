// Entities
import { MomentEntity } from '../moments/entities/moments.entity';
import { SavedMomentEntity } from './entities/saved-moment.entity';
import { SavedSearchEntity } from './entities/saved-search.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { SavedController } from './controllers/saved.controller';

// Services
import { SavedService } from './services/saved.service';

@Module({
  controllers: [SavedController],
  exports: [SavedService],
  imports: [TypeOrmModule.forFeature([MomentEntity, SavedMomentEntity, SavedSearchEntity])],
  providers: [SavedService],
})
export class SavedModule {}
