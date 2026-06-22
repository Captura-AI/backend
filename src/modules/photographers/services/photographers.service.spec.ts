// DTOs
import { CreateMomentDto } from '../../moments/dtos/create-moment.dto';
import { ListMyMomentsDto } from '../../moments/dtos/list-my-moments.dto';
import { ListPhotographersDto } from '../dtos/list-photographers.dto';
import { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';
import { UpdateMomentDto } from '../../moments/dtos/update-moment.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { OrderEntity } from '../../orders/entities/order.entity';
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { AiAnalysisService } from '../../moments/services/ai-analysis.service';
import { PlateService } from '../../plate/services/plate.service';
import { PhotographersService } from './photographers.service';
import { UsersService } from '../../users/services/users.service';

// TypeORM
import { DataSource } from 'typeorm';

const mockProfile = (): PhotographerProfileEntity => {
  const profile = new PhotographerProfileEntity();
  profile.id = 'profile-uuid-1';
  profile.userId = 'user-uuid-1';
  profile.artistName = 'Test Artist';
  profile.slug = 'test-artist';
  profile.bio = null;
  profile.location = null;
  profile.joinedAsPhotographerAt = 1700000000;
  profile.isApproved = true;
  return profile;
};

const mockUser = (): UsersEntity => {
  const user = new UsersEntity();
  user.id = 'user-uuid-1';
  user.email = 'test@test.com';
  user.username = 'testuser';
  user.role = UserRoleEnum.USER;
  return user;
};

const mockMoment = (): MomentEntity => {
  const moment = new MomentEntity();
  moment.id = 'moment-uuid-1';
  moment.caption = 'A beautiful sunset';
  moment.capturedAt = 1700000000;
  moment.city = 'Bandung';
  moment.story = null;
  moment.cameraInfo = null;
  moment.licensePlate = 'B 1234 ABC';
  moment.deletedAt = null;
  moment.imageUrl = null;
  moment.photographerId = 'user-uuid-1';
  moment.photographerProfileId = 'profile-uuid-1';
  moment.slug = 'a-beautiful-sunset-1700000000000';
  return moment;
};

describe('PhotographersService', () => {
  let service: PhotographersService;
  let mockMomentRepo: {
    findAndCount: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let mockOrderRepo: {
    createQueryBuilder: jest.Mock;
  };
  let mockProfileRepo: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let mockUsersService: {
    findOneById: jest.Mock;
  };
  let mockDataSource: {
    transaction: jest.Mock;
  };

  beforeEach(async () => {
    mockMomentRepo = {
      findAndCount: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    mockOrderRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ orderCount: '0', totalRevenue: '0' }),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    mockProfileRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockUsersService = {
      findOneById: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotographersService,
        {
          provide: getRepositoryToken(MomentEntity),
          useValue: mockMomentRepo,
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(PhotographerProfileEntity),
          useValue: mockProfileRepo,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AiAnalysisService,
          useValue: { analyzeMoment: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: PlateService,
          useValue: { searchByPlate: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PhotographersService>(PhotographersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onboard()', () => {
    it('creates a photographer profile and updates user role in a transaction', async () => {
      const profile = mockProfile();
      const user = mockUser();

      mockProfileRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockUsersService.findOneById.mockResolvedValue(user);
      mockDataSource.transaction.mockImplementation(async (cb: (manager: unknown) => unknown) => {
        const manager = {
          save: jest.fn().mockResolvedValue(profile),
          update: jest.fn().mockResolvedValue(undefined),
        };
        return cb(manager);
      });

      const dto = new OnboardPhotographerDto();
      dto.artistName = 'Test Artist';

      const result = await service.onboard('user-uuid-1', dto);

      expect(result).toEqual(profile);
      expect(mockProfileRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
      expect(mockProfileRepo.findOne).toHaveBeenCalledWith({
        where: { slug: 'test-artist' },
      });
      expect(mockUsersService.findOneById).toHaveBeenCalledWith('user-uuid-1');
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('throws ConflictException when user is already a photographer', async () => {
      mockProfileRepo.findOne.mockResolvedValue(mockProfile());

      const dto = new OnboardPhotographerDto();
      dto.artistName = 'Test Artist';

      await expect(service.onboard('user-uuid-1', dto)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockUsersService.findOneById.mockRejectedValue(
        new NotFoundException('User with id user-uuid-1 not found.'),
      );

      const dto = new OnboardPhotographerDto();
      dto.artistName = 'Test Artist';

      await expect(service.onboard('user-uuid-1', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById()', () => {
    it('returns the profile when found', async () => {
      const profile = mockProfile();
      mockProfileRepo.findOne.mockResolvedValue(profile);

      const result = await service.findById('profile-uuid-1');

      expect(result).toEqual(profile);
      expect(mockProfileRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'profile-uuid-1' },
        relations: { user: true },
      });
    });

    it('throws NotFoundException when profile does not exist', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUserId()', () => {
    it('returns the profile when found by userId', async () => {
      const profile = mockProfile();
      mockProfileRepo.findOne.mockResolvedValue(profile);

      const result = await service.findByUserId('user-uuid-1');

      expect(result).toEqual(profile);
      expect(mockProfileRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
      });
    });

    it('returns null when not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.findByUserId('user-uuid-1');

      expect(result).toBeNull();
    });
  });

  describe('findPublicDirectory()', () => {
    it('returns approved profiles with masked latest moment plates', async () => {
      const profile = mockProfile();
      const moment = mockMoment();
      const dto = new ListPhotographersDto();
      dto.limit = 12;
      dto.offset = 1;

      mockProfileRepo.findAndCount.mockResolvedValue([[profile], 1]);
      mockMomentRepo.find.mockResolvedValue([moment]);

      const result = await service.findPublicDirectory(dto);

      expect(result.total).toBe(1);
      expect(result.data[0]?.slug).toBe('test-artist');
      expect(result.data[0]?.latestMoments[0]?.licensePlate).toBe('B ***BC');
      expect(mockProfileRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { packages: true, reviews: true, user: true },
          where: expect.objectContaining({ approvalStatus: 'approved' }),
        }),
      );
    });
  });

  describe('findPublicDetailBySlug()', () => {
    it('returns profile detail with portfolio and masked public plates', async () => {
      const profile = mockProfile();
      const moment = mockMoment();

      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockMomentRepo.find.mockResolvedValue([moment]);

      const result = await service.findPublicDetailBySlug('test-artist');

      expect(result.slug).toBe('test-artist');
      expect(result.portfolio[0]?.licensePlate).toBe('B ***BC');
      expect(result.latestMoments[0]?.licensePlate).toBe('B ***BC');
      expect(mockProfileRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { approvalStatus: 'approved', deletedAt: expect.anything(), slug: 'test-artist' },
        }),
      );
    });

    it('throws NotFoundException when public slug is missing', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.findPublicDetailBySlug('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMoment()', () => {
    it('creates a moment and returns it', async () => {
      const profile = mockProfile();
      const moment = mockMoment();

      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockDataSource.transaction.mockImplementation(async (cb: (manager: unknown) => unknown) => {
        const manager = {
          save: jest.fn().mockResolvedValue(moment),
        };
        return cb(manager);
      });

      const dto = new CreateMomentDto();
      dto.caption = 'A beautiful sunset';

      const result = await service.createMoment('user-uuid-1', dto);

      expect(result).toEqual(moment);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('creates moment with licenses when provided', async () => {
      const profile = mockProfile();
      const moment = mockMoment();
      const savedLicense = new MomentLicenseEntity();
      savedLicense.momentId = moment.id;

      const saveMock = jest
        .fn()
        .mockResolvedValueOnce(moment)
        .mockResolvedValueOnce([savedLicense]);

      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockDataSource.transaction.mockImplementation(async (cb: (manager: unknown) => unknown) => {
        const manager = { save: saveMock };
        return cb(manager);
      });

      const dto = new CreateMomentDto();
      dto.caption = 'A beautiful sunset';
      dto.licenses = [{ licenseTypeId: 'lt-uuid-1', price: 9.99 }];

      const result = await service.createMoment('user-uuid-1', dto);

      expect(result).toEqual(moment);
      expect(saveMock).toHaveBeenCalledTimes(2);
    });

    it('throws ForbiddenException when user is not a photographer', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      const dto = new CreateMomentDto();
      dto.caption = 'Test';

      await expect(service.createMoment('user-uuid-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('wraps unexpected errors in BadRequestException', async () => {
      const profile = mockProfile();
      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockDataSource.transaction.mockRejectedValue(new Error('DB error'));

      const dto = new CreateMomentDto();
      dto.caption = 'Test';

      await expect(service.createMoment('user-uuid-1', dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMyMoments()', () => {
    it('returns paginated moments for the authenticated photographer', async () => {
      const moments = [mockMoment()];
      mockMomentRepo.findAndCount.mockResolvedValue([moments, 1]);

      const dto = new ListMyMomentsDto();
      dto.limit = 10;
      dto.offset = 1;

      const result = await service.findMyMoments('user-uuid-1', dto);

      expect(result.data).toEqual(moments);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(1);
      expect(mockMomentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: expect.objectContaining({ photographerId: 'user-uuid-1' }),
        }),
      );
    });

    it('returns empty result when photographer has no moments', async () => {
      mockMomentRepo.findAndCount.mockResolvedValue([[], 0]);

      const dto = new ListMyMomentsDto();

      const result = await service.findMyMoments('user-uuid-1', dto);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('passes Between filter when both startDate and endDate are provided', async () => {
      mockMomentRepo.findAndCount.mockResolvedValue([[], 0]);

      const dto = new ListMyMomentsDto();
      dto.startDate = 1750521600;
      dto.endDate = 1750607999;

      await service.findMyMoments('user-uuid-1', dto);

      expect(mockMomentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            capturedAt: expect.objectContaining({ _type: 'between' }),
          }),
        }),
      );
    });

    it('passes MoreThanOrEqual filter when only startDate is provided', async () => {
      mockMomentRepo.findAndCount.mockResolvedValue([[], 0]);

      const dto = new ListMyMomentsDto();
      dto.startDate = 1750521600;

      await service.findMyMoments('user-uuid-1', dto);

      expect(mockMomentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            capturedAt: expect.objectContaining({ _type: 'moreThanOrEqual' }),
          }),
        }),
      );
    });

    it('passes LessThanOrEqual filter when only endDate is provided', async () => {
      mockMomentRepo.findAndCount.mockResolvedValue([[], 0]);

      const dto = new ListMyMomentsDto();
      dto.endDate = 1750607999;

      await service.findMyMoments('user-uuid-1', dto);

      expect(mockMomentRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            capturedAt: expect.objectContaining({ _type: 'lessThanOrEqual' }),
          }),
        }),
      );
    });

    it('omits capturedAt filter when no date range is provided', async () => {
      mockMomentRepo.findAndCount.mockResolvedValue([[], 0]);

      const dto = new ListMyMomentsDto();

      await service.findMyMoments('user-uuid-1', dto);

      const call = mockMomentRepo.findAndCount.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty('capturedAt');
    });
  });

  describe('findMyMomentById()', () => {
    it('returns the moment when found and owned by the photographer', async () => {
      const moment = mockMoment();
      mockMomentRepo.findOne.mockResolvedValue(moment);

      const result = await service.findMyMomentById('user-uuid-1', 'moment-uuid-1');

      expect(result).toEqual(moment);
      expect(mockMomentRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: { licenses: { licenseType: true } },
          where: expect.objectContaining({
            id: 'moment-uuid-1',
            photographerId: 'user-uuid-1',
          }),
        }),
      );
    });

    it('throws NotFoundException when moment does not exist or not owned', async () => {
      mockMomentRepo.findOne.mockResolvedValue(null);

      await expect(service.findMyMomentById('user-uuid-1', 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMyMoment()', () => {
    it('updates moment fields and returns updated moment', async () => {
      const moment = mockMoment();
      const updatedMoment = { ...moment, caption: 'Updated caption' } as MomentEntity;

      mockMomentRepo.findOne.mockResolvedValue(moment);
      mockDataSource.transaction.mockImplementation(async (cb: (manager: unknown) => unknown) => {
        const manager = {
          delete: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockResolvedValue(updatedMoment),
        };
        return cb(manager);
      });

      const dto = new UpdateMomentDto();
      dto.caption = 'Updated caption';

      const result = await service.updateMyMoment('user-uuid-1', 'moment-uuid-1', dto);

      expect(result).toEqual(updatedMoment);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('replaces licenses when provided in update dto', async () => {
      const moment = mockMoment();

      const deleteMock = jest.fn().mockResolvedValue(undefined);
      const saveMock = jest.fn().mockResolvedValueOnce(moment).mockResolvedValueOnce([]);

      mockMomentRepo.findOne.mockResolvedValue(moment);
      mockDataSource.transaction.mockImplementation(async (cb: (manager: unknown) => unknown) => {
        const manager = { delete: deleteMock, save: saveMock };
        return cb(manager);
      });

      const dto = new UpdateMomentDto();
      dto.licenses = [{ licenseTypeId: 'lt-uuid-1', price: 49.99 }];

      await service.updateMyMoment('user-uuid-1', 'moment-uuid-1', dto);

      expect(deleteMock).toHaveBeenCalledWith(MomentLicenseEntity, { momentId: 'moment-uuid-1' });
      expect(saveMock).toHaveBeenCalledTimes(2);
    });

    it('throws NotFoundException when moment does not exist or not owned', async () => {
      mockMomentRepo.findOne.mockResolvedValue(null);

      const dto = new UpdateMomentDto();
      dto.caption = 'Test';

      await expect(service.updateMyMoment('user-uuid-1', 'non-existent-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteMyMoment()', () => {
    it('soft-deletes the moment by setting deletedAt timestamp', async () => {
      const moment = mockMoment();
      mockMomentRepo.findOne.mockResolvedValue(moment);
      mockMomentRepo.update.mockResolvedValue(undefined);

      await service.deleteMyMoment('user-uuid-1', 'moment-uuid-1');

      expect(mockMomentRepo.update).toHaveBeenCalledWith(
        { id: 'moment-uuid-1' },
        expect.objectContaining({ deletedAt: expect.any(Number) }),
      );
    });

    it('throws NotFoundException when moment does not exist or not owned', async () => {
      mockMomentRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteMyMoment('user-uuid-1', 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve()', () => {
    it('sets approvalStatus to approved and isApproved to true', async () => {
      const profile = mockProfile();
      profile.isApproved = false;

      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockProfileRepo.save.mockImplementation((p: PhotographerProfileEntity) => Promise.resolve(p));

      const result = await service.approve('profile-uuid-1');

      expect(result.isApproved).toBe(true);
      expect(result.approvalStatus).toBe('approved');
    });

    it('throws NotFoundException when profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.approve('missing-profile')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject()', () => {
    it('sets approvalStatus to rejected and isApproved to false', async () => {
      const profile = mockProfile();
      profile.isApproved = true;

      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockProfileRepo.save.mockImplementation((p: PhotographerProfileEntity) => Promise.resolve(p));

      const result = await service.reject('profile-uuid-1');

      expect(result.isApproved).toBe(false);
      expect(result.approvalStatus).toBe('rejected');
    });

    it('throws NotFoundException when profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.reject('missing-profile')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEarningsSummary()', () => {
    it('returns earnings summary with 70/30 photographer/platform split', async () => {
      const profile = mockProfile();
      mockProfileRepo.findOne.mockResolvedValue(profile);

      const qbMock = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ orderCount: '4', totalRevenue: '100000' }),
      };
      mockOrderRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.getEarningsSummary('user-uuid-1');

      expect(result.totalRevenue).toBe(100000);
      expect(result.photographerShare).toBe(70000);
      expect(result.platformFee).toBe(30000);
      expect(result.orderCount).toBe(4);
      expect(result.currency).toBe('IDR');
    });

    it('returns zero summary when no paid orders exist', async () => {
      const profile = mockProfile();
      mockProfileRepo.findOne.mockResolvedValue(profile);

      const qbMock = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };
      mockOrderRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.getEarningsSummary('user-uuid-1');

      expect(result.totalRevenue).toBe(0);
      expect(result.photographerShare).toBe(0);
      expect(result.orderCount).toBe(0);
    });

    it('throws NotFoundException when photographer profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.getEarningsSummary('user-uuid-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEarningsHistory()', () => {
    it('returns paginated list of paid orders for the photographer', async () => {
      const profile = mockProfile();
      mockProfileRepo.findOne.mockResolvedValue(profile);

      const qbMock = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockOrderRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.getEarningsHistory('user-uuid-1', 10, 1);

      expect(result.total).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(1);
    });

    it('throws NotFoundException when photographer profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.getEarningsHistory('user-uuid-1', 10, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
