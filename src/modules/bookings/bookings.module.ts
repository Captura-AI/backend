// Entities
import { BookingEntity } from './entities/booking.entity';
import { PhotographerProfileEntity } from '../photographers/entities/photographer-profile.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Controllers
import { BookingsController } from './controllers/bookings.controller';

// Services
import { BookingsService } from './services/bookings.service';

@Module({
  controllers: [BookingsController],
  exports: [BookingsService],
  imports: [TypeOrmModule.forFeature([BookingEntity, PhotographerProfileEntity])],
  providers: [BookingsService],
})
export class BookingsModule {}
