// DTOs
import { SearchMomentDto } from '../dtos/search-moment.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { MomentsService } from '../services/moments.service';

// Controllers
import { MomentsController } from './moments.controller';

const mockMomentsService = {
  findOneById: jest.fn(),
  findRecent: jest.fn(),
  getFacets: jest.fn(),
  search: jest.fn(),
};

describe('MomentsController', () => {
  let controller: MomentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MomentsController],
      providers: [{ provide: MomentsService, useValue: mockMomentsService }],
    }).compile();

    controller = module.get<MomentsController>(MomentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search()', () => {
    it('returns search results from service', async () => {
      const paginatedResult = { content: [], meta: {} };
      mockMomentsService.search.mockResolvedValue(paginatedResult);

      const body = new SearchMomentDto();
      const response = await controller.search(body);

      expect(mockMomentsService.search).toHaveBeenCalledWith(body);
      expect(response.result).toEqual(paginatedResult);
    });
  });

  describe('findRecent()', () => {
    it('calls service with parsed limit', async () => {
      const moments: MomentEntity[] = [];
      mockMomentsService.findRecent.mockResolvedValue(moments);

      await controller.findRecent('5');

      expect(mockMomentsService.findRecent).toHaveBeenCalledWith(5);
    });

    it('uses default limit 10 when no query param provided', async () => {
      mockMomentsService.findRecent.mockResolvedValue([]);

      await controller.findRecent(undefined);

      expect(mockMomentsService.findRecent).toHaveBeenCalledWith(10);
    });
  });

  describe('getFacets()', () => {
    it('returns facets from service', async () => {
      const facets = { cities: [], vehicleTypes: [] };
      mockMomentsService.getFacets.mockResolvedValue(facets);

      const response = await controller.getFacets();

      expect(mockMomentsService.getFacets).toHaveBeenCalled();
      expect(response.result).toEqual(facets);
    });
  });

  describe('findOneById()', () => {
    it('returns moment by id from service', async () => {
      const moment = new MomentEntity();
      moment.id = 'test-uuid';
      mockMomentsService.findOneById.mockResolvedValue(moment);

      const response = await controller.findOneById({ id: 'test-uuid' });

      expect(mockMomentsService.findOneById).toHaveBeenCalledWith('test-uuid');
      expect(response.result).toEqual(moment);
    });
  });
});
