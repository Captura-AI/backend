// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// Controller & Service
import { SavedController } from './saved.controller';
import { SavedService } from '../services/saved.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockUser = (): IRequestUser => ({
  email: 'test@test.com',
  id: 'user-uuid-1',
  role: UserRoleEnum.USER,
  username: 'testuser',
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('SavedController', () => {
  let controller: SavedController;
  let mockService: {
    createSavedSearch: jest.Mock;
    listSavedMoments: jest.Mock;
    listSavedSearches: jest.Mock;
    removeSavedMoment: jest.Mock;
    removeSavedSearch: jest.Mock;
    saveMoment: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      createSavedSearch: jest.fn(),
      listSavedMoments: jest.fn(),
      listSavedSearches: jest.fn(),
      removeSavedMoment: jest.fn(),
      removeSavedSearch: jest.fn(),
      saveMoment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedController],
      providers: [{ provide: SavedService, useValue: mockService }],
    }).compile();

    controller = module.get<SavedController>(SavedController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findSavedMoments()', () => {
    it('returns list of saved moments for the current user', async () => {
      const moments = [{ id: 'moment-uuid-1' }];
      mockService.listSavedMoments.mockResolvedValue(moments);

      const response = await controller.findSavedMoments(mockUser());

      expect(mockService.listSavedMoments).toHaveBeenCalledWith('user-uuid-1');
      expect(response).toEqual({
        message: 'Saved moments retrieved successfully',
        result: moments,
      });
    });
  });

  describe('saveMoment()', () => {
    it('saves a moment and returns the bookmark', async () => {
      const saved = { id: 'saved-uuid-1', momentId: 'moment-uuid-1', userId: 'user-uuid-1' };
      mockService.saveMoment.mockResolvedValue(saved);

      const response = await controller.saveMoment(mockUser(), { momentId: 'moment-uuid-1' });

      expect(mockService.saveMoment).toHaveBeenCalledWith('user-uuid-1', 'moment-uuid-1');
      expect(response).toEqual({
        message: 'Moment saved successfully',
        result: saved,
      });
    });
  });

  describe('removeSavedMoment()', () => {
    it('removes a saved moment and returns void', async () => {
      mockService.removeSavedMoment.mockResolvedValue(undefined);

      const response = await controller.removeSavedMoment(mockUser(), 'moment-uuid-1');

      expect(mockService.removeSavedMoment).toHaveBeenCalledWith('user-uuid-1', 'moment-uuid-1');
      expect(response).toBeUndefined();
    });
  });

  describe('findSavedSearches()', () => {
    it('returns list of saved searches for the current user', async () => {
      const searches = [{ id: 'search-uuid-1', query: 'B 1234 XY' }];
      mockService.listSavedSearches.mockResolvedValue(searches);

      const response = await controller.findSavedSearches(mockUser());

      expect(mockService.listSavedSearches).toHaveBeenCalledWith('user-uuid-1');
      expect(response).toEqual({
        message: 'Saved searches retrieved successfully',
        result: searches,
      });
    });
  });

  describe('createSavedSearch()', () => {
    it('creates a saved search and returns result', async () => {
      const body = { label: 'My search', licensePlate: 'B 1234 XY' };
      const saved = { id: 'search-uuid-1', ...body, userId: 'user-uuid-1' };
      mockService.createSavedSearch.mockResolvedValue(saved);

      const response = await controller.createSavedSearch(mockUser(), body as never);

      expect(mockService.createSavedSearch).toHaveBeenCalledWith('user-uuid-1', body);
      expect(response).toEqual({
        message: 'Search saved successfully',
        result: saved,
      });
    });
  });

  describe('removeSavedSearch()', () => {
    it('removes a saved search and returns void', async () => {
      mockService.removeSavedSearch.mockResolvedValue(undefined);

      const response = await controller.removeSavedSearch(mockUser(), { id: 'search-uuid-1' });

      expect(mockService.removeSavedSearch).toHaveBeenCalledWith('user-uuid-1', 'search-uuid-1');
      expect(response).toBeUndefined();
    });
  });
});
