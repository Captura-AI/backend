// Controllers
import { UsersController } from './controllers/users.controller';

// Entities
import { PhotographerProfileEntity } from '../photographers/entities/photographer-profile.entity';
import { UsersEntity } from './entities/users.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsersEntity, PhotographerProfileEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
