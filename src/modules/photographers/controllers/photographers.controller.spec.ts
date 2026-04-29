// DTOs
import { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';

// Entities
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Controllers
import { PhotographersController } from './photographers.controller';

// Services
import { PhotographersService } from '../services/photographers.service';

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

const mockRequestUser = (): IRequestUser => ({
  email: 'test@test.com',
  id: 'user-uuid-1',
  role: UserRoleEnum.USER as TUserRole,
  username: 'testuser',
});

describe('PhotographersController', () => {
  let controller: PhotographersController;
  let mockPhotographersService: {
    findById: jest.Mock;
    onboard: jest.Mock;
  };

  beforeEach(async () => {
    mockPhotographersService = {
      findById: jest.fn(),
      onboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhotographersController],
      providers: [
        {
          provide: PhotographersService,
          useValue: mockPhotographersService,
        },
      ],
    }).compile();

    controller = module.get<PhotographersController>(PhotographersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('onboard()', () => {
    it('calls service.onboard with user id and dto, returns result', async () => {
      const profile = mockProfile();
      const user = mockRequestUser();
      const dto = new OnboardPhotographerDto();
      dto.artistName = 'Test Artist';

      mockPhotographersService.onboard.mockResolvedValue(profile);

      const response = await controller.onboard(user, dto);

      expect(mockPhotographersService.onboard).toHaveBeenCalledWith('user-uuid-1', dto);
      expect(response).toEqual({
        message: 'Successfully onboarded as photographer',
        result: profile,
      });
    });
  });

  describe('findById()', () => {
    it('calls service.findById with param id, returns result', async () => {
      const profile = mockProfile();
      mockPhotographersService.findById.mockResolvedValue(profile);

      const response = await controller.findById({ id: 'profile-uuid-1' });

      expect(mockPhotographersService.findById).toHaveBeenCalledWith('profile-uuid-1');
      expect(response).toEqual({
        message: 'Photographer profile retrieved successfully',
        result: profile,
      });
    });
  });
});
