// Entities
import { BookingEntity } from '../entities/booking.entity';

// Enums
import { BookingStatusEnum } from '../enums/booking-status.enum';
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Controller & Service
import { BookingsController } from './bookings.controller';
import { BookingsService } from '../services/bookings.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockUser = (role: UserRoleEnum = UserRoleEnum.USER): IRequestUser => ({
  email: 'test@test.com',
  id: 'user-uuid-1',
  role,
  username: 'testuser',
});

const mockBooking = (overrides: Partial<BookingEntity> = {}): BookingEntity => {
  const booking = new BookingEntity();
  booking.id = 'booking-uuid-1';
  booking.userId = 'user-uuid-1';
  booking.photographerProfileId = 'profile-uuid-1';
  booking.status = BookingStatusEnum.PENDING;
  booking.proposedDate = 1700000000;
  booking.currency = 'IDR';
  return Object.assign(booking, overrides);
};

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('BookingsController', () => {
  let controller: BookingsController;
  let mockService: {
    create: jest.Mock;
    findForUser: jest.Mock;
    findOneById: jest.Mock;
    accept: jest.Mock;
    decline: jest.Mock;
    proposeTime: jest.Mock;
    cancel: jest.Mock;
    complete: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      accept: jest.fn(),
      cancel: jest.fn(),
      complete: jest.fn(),
      create: jest.fn(),
      decline: jest.fn(),
      findForUser: jest.fn(),
      findOneById: jest.fn(),
      proposeTime: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [{ provide: BookingsService, useValue: mockService }],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('delegates to service.create and returns wrapped result', async () => {
      const booking = mockBooking();
      mockService.create.mockResolvedValue(booking);

      const response = await controller.create(mockUser(), {
        photographerProfileId: 'profile-uuid-1',
        proposedDate: 1700000000,
      });

      expect(response.result).toBe(booking);
      expect(response.message).toBe('Booking created successfully');
      expect(mockService.create).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({
          photographerProfileId: 'profile-uuid-1',
        }),
      );
    });
  });

  describe('findMyBookings()', () => {
    it('delegates to service.findForUser with user id and role', async () => {
      const payload = { data: [], limit: 10, offset: 1, total: 0 };
      mockService.findForUser.mockResolvedValue(payload);

      const response = await controller.findMyBookings(mockUser(UserRoleEnum.PHOTOGRAPHER), {
        limit: 10,
        offset: 1,
        get skip() {
          return 0;
        },
      });

      expect(response.result).toBe(payload);
      expect(mockService.findForUser).toHaveBeenCalledWith(
        'user-uuid-1',
        UserRoleEnum.PHOTOGRAPHER,
        expect.anything(),
      );
    });
  });

  describe('findOne()', () => {
    it('delegates to service.findOneById', async () => {
      const booking = mockBooking();
      mockService.findOneById.mockResolvedValue(booking);

      const response = await controller.findOne(mockUser(), { id: 'booking-uuid-1' });

      expect(response.result).toBe(booking);
      expect(mockService.findOneById).toHaveBeenCalledWith(
        'booking-uuid-1',
        'user-uuid-1',
        UserRoleEnum.USER,
      );
    });
  });

  describe('accept()', () => {
    it('delegates to service.accept and returns accepted booking', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.ACCEPTED });
      mockService.accept.mockResolvedValue(booking);

      const response = await controller.accept(
        mockUser(UserRoleEnum.PHOTOGRAPHER),
        { id: 'booking-uuid-1' },
        { responseMessage: 'Sure!' },
      );

      expect(response.result.status).toBe(BookingStatusEnum.ACCEPTED);
      expect(response.message).toBe('Booking accepted');
      expect(mockService.accept).toHaveBeenCalledWith('booking-uuid-1', 'user-uuid-1', {
        responseMessage: 'Sure!',
      });
    });
  });

  describe('decline()', () => {
    it('delegates to service.decline', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.DECLINED });
      mockService.decline.mockResolvedValue(booking);

      const response = await controller.decline(
        mockUser(UserRoleEnum.PHOTOGRAPHER),
        { id: 'booking-uuid-1' },
        { responseMessage: 'Not available.' },
      );

      expect(response.result.status).toBe(BookingStatusEnum.DECLINED);
      expect(response.message).toBe('Booking declined');
    });
  });

  describe('proposeTime()', () => {
    it('delegates to service.proposeTime', async () => {
      const booking = mockBooking({ counterProposedDate: 1800000000 });
      mockService.proposeTime.mockResolvedValue(booking);

      const response = await controller.proposeTime(
        mockUser(UserRoleEnum.PHOTOGRAPHER),
        { id: 'booking-uuid-1' },
        { counterProposedDate: 1800000000 },
      );

      expect(response.result.counterProposedDate).toBe(1800000000);
      expect(response.message).toBe('Alternative time proposed');
    });
  });

  describe('cancel()', () => {
    it('delegates to service.cancel with user id and role', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.CANCELLED });
      mockService.cancel.mockResolvedValue(booking);

      const response = await controller.cancel(mockUser(), { id: 'booking-uuid-1' });

      expect(response.result.status).toBe(BookingStatusEnum.CANCELLED);
      expect(response.message).toBe('Booking cancelled');
      expect(mockService.cancel).toHaveBeenCalledWith(
        'booking-uuid-1',
        'user-uuid-1',
        UserRoleEnum.USER,
      );
    });
  });

  describe('complete()', () => {
    it('delegates to service.complete', async () => {
      const booking = mockBooking({ status: BookingStatusEnum.COMPLETED });
      mockService.complete.mockResolvedValue(booking);

      const response = await controller.complete(mockUser(UserRoleEnum.PHOTOGRAPHER), {
        id: 'booking-uuid-1',
      });

      expect(response.result.status).toBe(BookingStatusEnum.COMPLETED);
      expect(response.message).toBe('Booking completed');
      expect(mockService.complete).toHaveBeenCalledWith('booking-uuid-1', 'user-uuid-1');
    });
  });
});
