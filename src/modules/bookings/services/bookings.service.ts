// Constants
import { assertTransitionAllowed } from '../constants/booking-transitions.constant';

// DTOs
import type { CreateBookingDto } from '../dtos/create-booking.dto';
import type { ListBookingsDto } from '../dtos/list-bookings.dto';
import type { ProposeTimeBookingDto } from '../dtos/propose-time-booking.dto';
import type { RespondBookingDto } from '../dtos/respond-booking.dto';

// Entities
import { BookingEntity } from '../entities/booking.entity';
import { PhotographerProfileEntity } from '../../photographers/entities/photographer-profile.entity';

// Enums
import { BookingStatusEnum } from '../enums/booking-status.enum';
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// TypeORM
import type { FindManyOptions } from 'typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly _bookingsRepository: Repository<BookingEntity>,
    @InjectRepository(PhotographerProfileEntity)
    private readonly _photographerProfileRepository: Repository<PhotographerProfileEntity>,
  ) {}

  public async create(userId: string, dto: CreateBookingDto): Promise<BookingEntity> {
    const photographerExists = await this._photographerProfileRepository.exists({
      where: { id: dto.photographerProfileId },
    });

    if (!photographerExists) {
      throw new NotFoundException(`Photographer profile not found.`);
    }

    const booking = new BookingEntity();
    booking.agreedPrice = null;
    booking.counterProposedDate = null;
    booking.currency = 'IDR';
    booking.location = dto.location ?? null;
    booking.message = dto.message ?? null;
    booking.packageId = dto.packageId ?? null;
    booking.photographerProfileId = dto.photographerProfileId;
    booking.proposedDate = dto.proposedDate;
    booking.responseMessage = null;
    booking.status = BookingStatusEnum.PENDING;
    booking.userId = userId;

    return this._bookingsRepository.save(booking);
  }

  public async findForUser(
    userId: string,
    role: UserRoleEnum,
    query: ListBookingsDto,
  ): Promise<{ data: BookingEntity[]; limit: number; offset: number; total: number }> {
    const where: FindManyOptions<BookingEntity>['where'] = query.status
      ? { status: query.status }
      : {};

    if (role === UserRoleEnum.PHOTOGRAPHER) {
      const profile = await this._photographerProfileRepository.findOne({ where: { userId } });

      if (!profile) {
        return { data: [], limit: query.limit ?? 10, offset: query.offset ?? 1, total: 0 };
      }

      Object.assign(where, { photographerProfileId: profile.id });
    } else {
      Object.assign(where, { userId });
    }

    const [data, total] = await this._bookingsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { package: true, photographerProfile: { user: true }, user: true },
      skip: query.skip,
      take: query.limit ?? 10,
      where,
    });

    return { data, limit: query.limit ?? 10, offset: query.offset ?? 1, total };
  }

  public async findOneById(id: string, userId: string, role: UserRoleEnum): Promise<BookingEntity> {
    const booking = await this._bookingsRepository.findOne({
      relations: { package: true, photographerProfile: { user: true }, user: true },
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found.`);
    }

    this._assertAccess(booking, userId, role);

    return booking;
  }

  public async accept(
    id: string,
    photographerUserId: string,
    dto: RespondBookingDto,
  ): Promise<BookingEntity> {
    const booking = await this._findAndAssertPhotographerOwnership(id, photographerUserId);

    assertTransitionAllowed(booking.status, BookingStatusEnum.ACCEPTED);

    booking.responseMessage = dto.responseMessage ?? null;
    booking.status = BookingStatusEnum.ACCEPTED;

    return this._bookingsRepository.save(booking);
  }

  public async decline(
    id: string,
    photographerUserId: string,
    dto: RespondBookingDto,
  ): Promise<BookingEntity> {
    const booking = await this._findAndAssertPhotographerOwnership(id, photographerUserId);

    assertTransitionAllowed(booking.status, BookingStatusEnum.DECLINED);

    booking.responseMessage = dto.responseMessage ?? null;
    booking.status = BookingStatusEnum.DECLINED;

    return this._bookingsRepository.save(booking);
  }

  public async proposeTime(
    id: string,
    photographerUserId: string,
    dto: ProposeTimeBookingDto,
  ): Promise<BookingEntity> {
    const booking = await this._findAndAssertPhotographerOwnership(id, photographerUserId);

    // propose-time is only valid from PENDING; status stays PENDING
    assertTransitionAllowed(booking.status, BookingStatusEnum.PENDING);

    booking.counterProposedDate = dto.counterProposedDate;
    booking.responseMessage = dto.responseMessage ?? null;

    return this._bookingsRepository.save(booking);
  }

  public async cancel(id: string, userId: string, role: UserRoleEnum): Promise<BookingEntity> {
    const booking = await this._bookingsRepository.findOne({
      relations: { photographerProfile: true },
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found.`);
    }

    this._assertAccess(booking, userId, role);
    assertTransitionAllowed(booking.status, BookingStatusEnum.CANCELLED);

    booking.status = BookingStatusEnum.CANCELLED;

    return this._bookingsRepository.save(booking);
  }

  public async complete(id: string, photographerUserId: string): Promise<BookingEntity> {
    const booking = await this._findAndAssertPhotographerOwnership(id, photographerUserId);

    assertTransitionAllowed(booking.status, BookingStatusEnum.COMPLETED);

    booking.status = BookingStatusEnum.COMPLETED;

    return this._bookingsRepository.save(booking);
  }

  private async _findAndAssertPhotographerOwnership(
    id: string,
    photographerUserId: string,
  ): Promise<BookingEntity> {
    const booking = await this._bookingsRepository.findOne({
      relations: { photographerProfile: true },
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found.`);
    }

    const profile = await this._photographerProfileRepository.findOne({
      where: { userId: photographerUserId },
    });

    if (booking.photographerProfileId !== profile?.id) {
      throw new ForbiddenException('You do not own this booking.');
    }

    return booking;
  }

  private _assertAccess(booking: BookingEntity, userId: string, role: UserRoleEnum): void {
    if (role === UserRoleEnum.ADMIN) {
      return;
    }

    if (role === UserRoleEnum.PHOTOGRAPHER) {
      // Photographer ownership is resolved via profile; we allow access if
      // booking.userId matches (buyer viewing their own booking) OR the
      // caller is the photographer — checked lazily here by profile query.
      // For simple viewing we just ensure the caller is involved:
      if (booking.userId === userId) {
        return;
      }

      if (booking.photographerProfile?.userId === userId) {
        return;
      }

      throw new ForbiddenException('Access denied.');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking.');
    }
  }
}
