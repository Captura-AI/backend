// Entities
import { HotspotEntity } from './entities/hotspot.entity';
import { MomentEntity } from '../moments/entities/moments.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { HotspotsController } from './controllers/hotspots.controller';

// Services
import { HotspotsService } from './services/hotspots.service';

@Module({
  controllers: [HotspotsController],
  exports: [HotspotsService],
  imports: [TypeOrmModule.forFeature([HotspotEntity, MomentEntity])],
  providers: [HotspotsService],
})
export class HotspotsModule {}
