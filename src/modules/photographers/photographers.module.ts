// Entities
import { PhotographerProfileEntity } from './entities/photographer-profile.entity';

// Modules
import { UsersModule } from '../users/users.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { PhotographersController } from './controllers/photographers.controller';

// Services
import { PhotographersService } from './services/photographers.service';

@Module({
  imports: [TypeOrmModule.forFeature([PhotographerProfileEntity]), UsersModule],
  controllers: [PhotographersController],
  providers: [PhotographersService],
  exports: [PhotographersService],
})
export class PhotographersModule {}
