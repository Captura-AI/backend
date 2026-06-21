// Entities
import { BookingEntity } from '../entities/booking.entity';
import { PhotographerProfileEntity } from '../../photographers/entities/photographer-profile.entity';

// Enums
import { BookingStatusEnum } from '../enums/booking-status.enum';
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { BookingsService } from './bookings.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockBooking = (overrides: Partial<BookingEntity> = {}): BookingEntity => {
  const booking = new BookingEntity();
  booking.id = 'booking-uuid-1';
  booking.userId = 'user-uuid-1';
  booking.photographerProfileId = 'profile-uuid-1';
  booking.packageId = null;
  booking.status = BookingStatusEnum.PENDING;
  booking.proposedDate = 1700000000;
  booking.counterProposedDate = null;
  booking.location = 'Jakarta';
  booking.message = 'Hello';
  booking.responseMessage = null;
  booking.agreedPrice = null;
  booking.currency = 'IDR';
  booking.createdAt = 1700000000;
  booking.updatedAt = 1700000000;
  booking.deletedAt = null;
  return Object.assign(booking, overrides);
};

const mockProfile = (
  overrides: Partial<PhotographerProfileEntity> = {},
): PhotographerProfileEntity => {
  const profile = new PhotographerProfileEntity();
  profile.id = 'profile-uuid-1';
  profile.userId = 'photographer-user-uuid-1';
  return Object.assign(profile, overrides);
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('BookingsService', () => {
  let service: BookingsService;
  let mockBookingsRepo: {
    exists: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let mockProfileRepo: {
    exists: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    mockBookingsRepo = {
      exists: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockProfileRepo = {
      exists: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: mockBookingsRepo,
        },
        {
          provide: getRepositoryToken(PhotographerProfileEntity),
          useValue: mockProfileRepo,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    jest.clearAllMocks();
  });

  // ─── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates and returns a booking when photographer exists', async () => {
      const booking = mockBooking();
      mockProfileRepo.exists.mockResolvedValue(true);
      mockBookingsRepo.save.mockResolvedValue(booking);

      const result = await service.create('user-uuid-1', {
        photographerProfileId: 'profile-uuid-1',
        proposedDate: 1700000000,
        location: 'Jakarta',
        message: 'Hello',
      });

      expect(result.status).toBe(BookingStatusEnum.PENDING);
      expect(result.userId).toBe('user-uuid-1');
      expect(mockBookingsRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when photographer profile not found', async () => {
      mockProfileRepo.exists.mockResolvedValue(false);

      await expect(
        service.create('user-uuid-1', {
          photographerProfileId: 'missing-id',
          proposedDate: 1700000000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets packageId when provided', async () => {
      const booking = mockBooking({ packageId: 'pkg-uuid-1' });
      mockProfileRepo.exists.mockResolvedValue(true);
      mockBookingsRepo.save.mockResolvedValue(booking);

      const result = await service.create('user-uuid-1', {
        photographerProfileId: 'profile-uuid-1',
        packageId: 'pkg-uuid-1',
        proposedDate: 1700000000,
      });

      expect(mockBookingsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ packageId: 'pkg-uuid-1' }),
      );
      expect(result.packageId).toBe('pkg-uuid-1');
    });
  });

  // ─── findForUser() ─────────────────────────────────────────────────────────

  describe('findForUser()', () => {
    it('filters by userId for USER role', async () => {
      const booking = mockBooking();
      mockBookingsRepo.findAndCount.mockResolvedValue([[booking], 1]);

      const result = await service.findForUser('user-uuid-1', UserRoleEnum.USER, {
        limit: 10,
        offset: 1,
        get skip() {
          return 0;
        },
      });

      expect(result.total).toBe(1);
      expect(result.data[0]?.id).toBe('booking-uuid-1');
      expect(mockBookingsRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-uuid-1' }) }),
      );
    });

    it('filters by photographerProfileId for PHOTOGRAPHER role', async () => {
      const booking = mockBooking();
      const profile = mockProfile();
      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockBookingsRepo.findAndCount.mockResolvedValue([[booking], 1]);

      const result = await service.findForUser(
        'photographer-user-uuid-1',
        UserRoleEnum.PHOTOGRAPHER,
        {
          limit: 10,
          offset: 1,
          get skip() {
            return 0;
          },
        },
      );

      expect(result.total).toBe(1);
      expect(mockBookingsRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ photographerProfileId: 'profile-uuid-1' }),
        }),
      );
    });

    it('returns empty list when photographer has no profile', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.findForUser(
        'photographer-user-uuid-1',
        UserRoleEnum.PHOTOGRAPHER,
        {
          limit: 10,
          offset: 1,
          get skip() {
            return 0;
          },
        },
      );

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
      expect(mockBookingsRepo.findAndCount).not.toHaveBeenCalled();
    });

    it('filters by status when provided', async () => {
      mockBookingsRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findForUser('user-uuid-1', UserRoleEnum.USER, {
        status: BookingStatusEnum.ACCEPTED,
        limit: 10,
        offset: 1,
        get skip() {
          return 0;
        },
      });

      expect(mockBookingsRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: BookingStatusEnum.ACCEPTED }),
        }),
      );
    });
  });

  // ─── findOneById() ─────────────────────────────────────────────────────────

  describe('findOneById()', () => {
    it('returns booking for the owning user', async () => {
      const booking = mockBooking();
      mockBookingsRepo.findOne.mockResolvedValue(booking);

      const result = await service.findOneById('booking-uuid-1', 'user-uuid-1', UserRoleEnum.USER);

      expect(result.id).toBe('booking-uuid-1');
    });

    it('throws NotFoundException when booking not found', async () => {
      mockBookingsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneById('missing', 'user-uuid-1', UserRoleEnum.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user does not own the booking', async () => {
      const booking = mockBooking({ userId: 'other-user-uuid' });
      mockBookingsRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.findOneById('booking-uuid-1', 'user-uuid-1', UserRoleEnum.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to access any booking', async () => {
      const booking = mockBooking({ userId: 'other-user-uuid' });
      mockBookingsRepo.findOne.mockResolvedValue(booking);

      const result = await service.findOneById('booking-uuid-1', 'admin-uuid', UserRoleEnum.ADMIN);

      expect(result.id).toBe('booking-uuid-1');
    });

    it('allows photographer to access their booking as buyer', async () => {
      const booking = mockBooking({ userId: 'photographer-user-uuid-1' });
      mockBookingsRepo.findOne.mockResolvedValue(booking);

      const result = await service.findOneById(
        'booking-uuid-1',
        'photographer-user-uuid-1',
        UserRoleEnum.PHOTOGRAPHER,
      );

      expect(result.id).toBe('booking-uuid-1');
    });

    it('allows photographer to access booking via profile relation', async () => {
      const booking = mockBooking({
        userId: 'buyer-uuid',
        photographerProfile: mockProfile({ userId: 'photographer-user-uuid-1' }),
      });
      mockBookingsRepo.findOne.mockResolvedValue(booking);

      const result = await service.findOneById(
        'booking-uuid-1',
        'photographer-user-uuid-1',
        UserRoleEnum.PHOTOGRAPHER,
      );

      expect(result.id).toBe('booking-uuid-1');
    });
  });

  // ─── accept() ──────────────────────────────────────────────────────────────

  describe('accept()', () => {
    it('accepts a PENDING booking', async () => {
      const booking = mockBooking();
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockBookingsRepo.save.mockImplementation((b: BookingEntity) => Promise.resolve(b));

      const result = await service.accept('booking-uuid-1', 'photographer-user-uuid-1', {
        responseMessage: 'Sure!',
      });

      expect(result.status).toBe(BookingStatusEnum.ACCEPTED);
      expect(result.responseMessage).toBe('Sure!');
    });

    it('throws BadRequestException when accepting non-PENDING booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.ACCEPTED });
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);

      await expect(
        service.accept('booking-uuid-1', 'photographer-user-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when photographer does not own booking', async () => {
      const booking = mockBooking({ photographerProfileId: 'another-profile-id' });
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);

      await expect(
        service.accept('booking-uuid-1', 'photographer-user-uuid-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when booking not found', async () => {
      mockBookingsRepo.findOne.mockResolvedValue(null);
      mockProfileRepo.findOne.mockResolvedValue(mockProfile());

      await expect(service.accept('missing', 'photographer-user-uuid-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── decline() ─────────────────────────────────────────────────────────────

  describe('decline()', () => {
    it('declines a PENDING booking', async () => {
      const booking = mockBooking();
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockBookingsRepo.save.mockImplementation((b: BookingEntity) => Promise.resolve(b));

      const result = await service.decline('booking-uuid-1', 'photographer-user-uuid-1', {
        responseMessage: 'Not available.',
      });

      expect(result.status).toBe(BookingStatusEnum.DECLINED);
    });

    it('throws BadRequestException when declining already DECLINED booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.DECLINED });
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);

      await expect(
        service.decline('booking-uuid-1', 'photographer-user-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── proposeTime() ─────────────────────────────────────────────────────────

  describe('proposeTime()', () => {
    it('sets counterProposedDate on a PENDING booking', async () => {
      const booking = mockBooking();
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockBookingsRepo.save.mockImplementation((b: BookingEntity) => Promise.resolve(b));

      const result = await service.proposeTime('booking-uuid-1', 'photographer-user-uuid-1', {
        counterProposedDate: 1800000000,
        responseMessage: 'How about this date?',
      });

      expect(result.counterProposedDate).toBe(1800000000);
      expect(result.status).toBe(BookingStatusEnum.PENDING);
    });

    it('throws BadRequestException when proposing time on ACCEPTED booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.ACCEPTED });
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);

      await expect(
        service.proposeTime('booking-uuid-1', 'photographer-user-uuid-1', {
          counterProposedDate: 1800000000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── cancel() ──────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('buyer can cancel a PENDING booking', async () => {
      const booking = mockBooking();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockBookingsRepo.save.mockImplementation((b: BookingEntity) => Promise.resolve(b));

      const result = await service.cancel('booking-uuid-1', 'user-uuid-1', UserRoleEnum.USER);

      expect(result.status).toBe(BookingStatusEnum.CANCELLED);
    });

    it('buyer can cancel an ACCEPTED booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.ACCEPTED });
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockBookingsRepo.save.mockImplementation((b: BookingEntity) => Promise.resolve(b));

      const result = await service.cancel('booking-uuid-1', 'user-uuid-1', UserRoleEnum.USER);

      expect(result.status).toBe(BookingStatusEnum.CANCELLED);
    });

    it('throws NotFoundException when booking not found', async () => {
      mockBookingsRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('missing', 'user-uuid-1', UserRoleEnum.USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when cancelling a COMPLETED booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.COMPLETED });
      mockBookingsRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancel('booking-uuid-1', 'user-uuid-1', UserRoleEnum.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when user does not own the booking', async () => {
      const booking = mockBooking({ userId: 'other-uuid' });
      mockBookingsRepo.findOne.mockResolvedValue(booking);

      await expect(
        service.cancel('booking-uuid-1', 'user-uuid-1', UserRoleEnum.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('admin can cancel any booking', async () => {
      const booking = mockBooking({ userId: 'other-uuid', status: BookingStatusEnum.ACCEPTED });
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockBookingsRepo.save.mockImplementation((b: BookingEntity) => Promise.resolve(b));

      const result = await service.cancel('booking-uuid-1', 'admin-uuid', UserRoleEnum.ADMIN);

      expect(result.status).toBe(BookingStatusEnum.CANCELLED);
    });
  });

  // ─── complete() ────────────────────────────────────────────────────────────

  describe('complete()', () => {
    it('marks an ACCEPTED booking as COMPLETED', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.ACCEPTED });
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockBookingsRepo.save.mockImplementation((b: BookingEntity) => Promise.resolve(b));

      const result = await service.complete('booking-uuid-1', 'photographer-user-uuid-1');

      expect(result.status).toBe(BookingStatusEnum.COMPLETED);
    });

    it('throws BadRequestException when completing a PENDING booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.PENDING });
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);

      await expect(service.complete('booking-uuid-1', 'photographer-user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when completing an already COMPLETED booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.COMPLETED });
      const profile = mockProfile();
      mockBookingsRepo.findOne.mockResolvedValue(booking);
      mockProfileRepo.findOne.mockResolvedValue(profile);

      await expect(service.complete('booking-uuid-1', 'photographer-user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── Status machine terminal states ────────────────────────────────────────

  describe('status machine — terminal states', () => {
    const terminalStates = [
      BookingStatusEnum.DECLINED,
      BookingStatusEnum.COMPLETED,
      BookingStatusEnum.CANCELLED,
    ];

    terminalStates.forEach((status) => {
      it(`throws BadRequestException when accepting from terminal state: ${status}`, async () => {
        const booking = mockBooking({ status });
        const profile = mockProfile();
        mockBookingsRepo.findOne.mockResolvedValue(booking);
        mockProfileRepo.findOne.mockResolvedValue(profile);

        await expect(
          service.accept('booking-uuid-1', 'photographer-user-uuid-1', {}),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
