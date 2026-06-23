// DTOs
import { CreateMomentDto } from '../../moments/dtos/create-moment.dto';
import { ListPhotographersDto } from '../dtos/list-photographers.dto';
import { ListMyMomentsDto } from '../../moments/dtos/list-my-moments.dto';
import { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';
import { UpdateMomentDto } from '../../moments/dtos/update-moment.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
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
  profile.slug = 'test-artist';
  profile.bio = null;
  profile.location = null;
  profile.joinedAsPhotographerAt = 1700000000;
  profile.isApproved = true;
  return profile;
};

const mockMoment = (): MomentEntity => {
  const moment = new MomentEntity();
  moment.id = 'moment-uuid-1';
  moment.caption = 'A beautiful sunset';
  moment.photographerId = 'user-uuid-1';
  moment.photographerProfileId = 'profile-uuid-1';
  moment.slug = 'a-beautiful-sunset-1700000000000';
  return moment;
};

const mockRequestUser = (): IRequestUser => ({
  email: 'test@test.com',
  id: 'user-uuid-1',
  role: UserRoleEnum.PHOTOGRAPHER as TUserRole,
  username: 'testuser',
});

describe('PhotographersController', () => {
  let controller: PhotographersController;
  let mockPhotographersService: {
    approve: jest.Mock;
    createMoment: jest.Mock;
    deleteMyMoment: jest.Mock;
    findById: jest.Mock;
    findPublicDetailBySlug: jest.Mock;
    findPublicDirectory: jest.Mock;
    findMyMomentById: jest.Mock;
    findMyMoments: jest.Mock;
    getEarningsHistory: jest.Mock;
    getEarningsSummary: jest.Mock;
    onboard: jest.Mock;
    reject: jest.Mock;
    triggerAiAnalysis: jest.Mock;
    updateMyMoment: jest.Mock;
  };

  beforeEach(async () => {
    mockPhotographersService = {
      approve: jest.fn(),
      createMoment: jest.fn(),
      deleteMyMoment: jest.fn(),
      findById: jest.fn(),
      findPublicDetailBySlug: jest.fn(),
      findPublicDirectory: jest.fn(),
      findMyMomentById: jest.fn(),
      findMyMoments: jest.fn(),
      getEarningsHistory: jest.fn(),
      getEarningsSummary: jest.fn(),
      onboard: jest.fn(),
      reject: jest.fn(),
      triggerAiAnalysis: jest.fn(),
      updateMyMoment: jest.fn(),
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

  describe('findPublicDirectory()', () => {
    it('calls service.findPublicDirectory with query, returns result', async () => {
      const query = new ListPhotographersDto();
      const result = { data: [], limit: 12, offset: 1, total: 0 };

      mockPhotographersService.findPublicDirectory.mockResolvedValue(result);

      const response = await controller.findPublicDirectory(query);

      expect(mockPhotographersService.findPublicDirectory).toHaveBeenCalledWith(query);
      expect(response).toEqual({
        message: 'Photographers retrieved successfully',
        result,
      });
    });
  });

  describe('findPublicBySlug()', () => {
    it('calls service.findPublicDetailBySlug with slug, returns result', async () => {
      const profile = mockProfile();

      mockPhotographersService.findPublicDetailBySlug.mockResolvedValue(profile);

      const response = await controller.findPublicBySlug('test-artist');

      expect(mockPhotographersService.findPublicDetailBySlug).toHaveBeenCalledWith('test-artist');
      expect(response).toEqual({
        message: 'Photographer detail retrieved successfully',
        result: profile,
      });
    });
  });

  describe('createMoment()', () => {
    it('calls service.createMoment with userId, dto and file, returns result', async () => {
      const moment = mockMoment();
      const user = mockRequestUser();
      const dto = new CreateMomentDto();
      dto.caption = 'A beautiful sunset';
      const imageFile = { path: 'uploads/moments/test.jpg' } as Express.Multer.File;

      mockPhotographersService.createMoment.mockResolvedValue(moment);

      const response = await controller.createMoment(user, dto, imageFile);

      expect(mockPhotographersService.createMoment).toHaveBeenCalledWith(
        'user-uuid-1',
        dto,
        imageFile,
      );
      expect(response).toEqual({
        message: 'Moment uploaded successfully',
        result: moment,
      });
    });

    it('calls service.createMoment without file when not provided', async () => {
      const moment = mockMoment();
      const user = mockRequestUser();
      const dto = new CreateMomentDto();
      dto.caption = 'A beautiful sunset';

      mockPhotographersService.createMoment.mockResolvedValue(moment);

      const response = await controller.createMoment(user, dto);

      expect(mockPhotographersService.createMoment).toHaveBeenCalledWith(
        'user-uuid-1',
        dto,
        undefined,
      );
      expect(response.message).toBe('Moment uploaded successfully');
    });
  });

  describe('findMyMoments()', () => {
    it('calls service.findMyMoments with userId and query, returns result', async () => {
      const moments = [mockMoment()];
      const paginatedResult = { data: moments, limit: 10, offset: 1, total: 1 };
      const user = mockRequestUser();
      const query = new ListMyMomentsDto();

      mockPhotographersService.findMyMoments.mockResolvedValue(paginatedResult);

      const response = await controller.findMyMoments(user, query);

      expect(mockPhotographersService.findMyMoments).toHaveBeenCalledWith('user-uuid-1', query);
      expect(response).toEqual({
        message: 'My moments retrieved successfully',
        result: paginatedResult,
      });
    });
  });

  describe('findMyMomentById()', () => {
    it('calls service.findMyMomentById with userId and momentId, returns result', async () => {
      const moment = mockMoment();
      const user = mockRequestUser();

      mockPhotographersService.findMyMomentById.mockResolvedValue(moment);

      const response = await controller.findMyMomentById(user, { id: 'moment-uuid-1' });

      expect(mockPhotographersService.findMyMomentById).toHaveBeenCalledWith(
        'user-uuid-1',
        'moment-uuid-1',
      );
      expect(response).toEqual({
        message: 'Moment detail retrieved successfully',
        result: moment,
      });
    });
  });

  describe('updateMyMoment()', () => {
    it('calls service.updateMyMoment with userId, momentId and dto, returns result', async () => {
      const moment = mockMoment();
      const user = mockRequestUser();
      const dto = new UpdateMomentDto();
      dto.caption = 'Updated caption';

      mockPhotographersService.updateMyMoment.mockResolvedValue(moment);

      const response = await controller.updateMyMoment(user, { id: 'moment-uuid-1' }, dto);

      expect(mockPhotographersService.updateMyMoment).toHaveBeenCalledWith(
        'user-uuid-1',
        'moment-uuid-1',
        dto,
      );
      expect(response).toEqual({
        message: 'Moment updated successfully',
        result: moment,
      });
    });
  });

  describe('deleteMyMoment()', () => {
    it('calls service.deleteMyMoment with userId and momentId, returns void', async () => {
      const user = mockRequestUser();

      mockPhotographersService.deleteMyMoment.mockResolvedValue(undefined);

      const response = await controller.deleteMyMoment(user, { id: 'moment-uuid-1' });

      expect(mockPhotographersService.deleteMyMoment).toHaveBeenCalledWith(
        'user-uuid-1',
        'moment-uuid-1',
      );
      expect(response).toBeUndefined();
    });
  });

  describe('getEarningsSummary()', () => {
    it('calls service.getEarningsSummary with user id, returns earnings', async () => {
      const user = mockRequestUser();
      const summary = {
        currency: 'IDR',
        orderCount: 5,
        photographerShare: 350000,
        platformFee: 150000,
        totalRevenue: 500000,
      };

      mockPhotographersService.getEarningsSummary.mockResolvedValue(summary);

      const response = await controller.getEarningsSummary(user);

      expect(mockPhotographersService.getEarningsSummary).toHaveBeenCalledWith('user-uuid-1');
      expect(response).toEqual({
        message: 'Earnings summary retrieved successfully',
        result: summary,
      });
    });
  });

  describe('getEarningsHistory()', () => {
    it('calls service.getEarningsHistory with user id and pagination params, returns history', async () => {
      const user = mockRequestUser();
      const history = { data: [], limit: 10, offset: 1, total: 0 };

      mockPhotographersService.getEarningsHistory.mockResolvedValue(history);

      const response = await controller.getEarningsHistory(user, 10, 1);

      expect(mockPhotographersService.getEarningsHistory).toHaveBeenCalledWith(
        'user-uuid-1',
        10,
        1,
      );
      expect(response).toEqual({
        message: 'Earnings history retrieved successfully',
        result: history,
      });
    });
  });

  describe('approvePhotographer()', () => {
    it('calls service.approve with profile id, returns approved profile', async () => {
      const profile = mockProfile();

      mockPhotographersService.approve.mockResolvedValue(profile);

      const response = await controller.approvePhotographer({ id: 'profile-uuid-1' });

      expect(mockPhotographersService.approve).toHaveBeenCalledWith('profile-uuid-1');
      expect(response).toEqual({
        message: 'Photographer profile approved',
        result: profile,
      });
    });
  });

  describe('rejectPhotographer()', () => {
    it('calls service.reject with profile id, returns rejected profile', async () => {
      const profile = mockProfile();

      mockPhotographersService.reject.mockResolvedValue(profile);

      const response = await controller.rejectPhotographer({ id: 'profile-uuid-1' });

      expect(mockPhotographersService.reject).toHaveBeenCalledWith('profile-uuid-1');
      expect(response).toEqual({
        message: 'Photographer profile rejected',
        result: profile,
      });
    });
  });
});
