// Controllers
import { MomentsController } from './controllers/moments.controller';

// Entities
import { MomentEntity } from './entities/moments.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { MomentsService } from './services/moments.service';

@Module({
  controllers: [MomentsController],
  exports: [MomentsService],
  imports: [TypeOrmModule.forFeature([MomentEntity])],
  providers: [MomentsService],
})
export class MomentsModule {}
