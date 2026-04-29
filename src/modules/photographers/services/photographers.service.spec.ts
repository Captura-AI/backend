// DTOs
import { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';

// Entities
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { PhotographersService } from './photographers.service';
import { UsersService } from '../../users/services/users.service';

// TypeORM
import { DataSource } from 'typeorm';

const mockProfile = (): PhotographerProfileEntity => {
  const profile = new PhotographerProfileEntity();
  profile.id = 'profile-uuid-1';
  profile.userId = 'user-uuid-1';
  profile.artistName = 'Test Artist';
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

describe('PhotographersService', () => {
  let service: PhotographersService;
  let mockProfileRepo: {
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
    mockProfileRepo = {
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

      mockProfileRepo.findOne.mockResolvedValue(null);
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
});
