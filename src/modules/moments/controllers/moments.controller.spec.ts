// DTOs
import { SearchMomentDto } from '../dtos/search-moment.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';
import { MomentLicenseEntity } from '../entities/moment-license.entity';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { MomentsService } from '../services/moments.service';

// Controllers
import { MomentsController } from './moments.controller';

const mockMomentsService = {
  findLicensesByMomentId: jest.fn(),
  findOneById: jest.fn(),
  findRecent: jest.fn(),
  findSimilar: jest.fn(),
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

  describe('findSimilar()', () => {
    it('calls service with parsed limit and returns similar moments', async () => {
      const similar: MomentEntity[] = [new MomentEntity()];
      mockMomentsService.findSimilar.mockResolvedValue(similar);

      const response = await controller.findSimilar({ id: 'test-uuid' }, '5');

      expect(mockMomentsService.findSimilar).toHaveBeenCalledWith('test-uuid', 5);
      expect(response.result).toEqual(similar);
      expect(response.message).toBe('Similar moments retrieved successfully');
    });

    it('uses default limit 10 when no query param provided', async () => {
      mockMomentsService.findSimilar.mockResolvedValue([]);

      await controller.findSimilar({ id: 'test-uuid' }, undefined);

      expect(mockMomentsService.findSimilar).toHaveBeenCalledWith('test-uuid', 10);
    });

    it('caps limit at 50', async () => {
      mockMomentsService.findSimilar.mockResolvedValue([]);

      await controller.findSimilar({ id: 'test-uuid' }, '999');

      expect(mockMomentsService.findSimilar).toHaveBeenCalledWith('test-uuid', 50);
    });
  });

  describe('findLicenses()', () => {
    it('returns licenses for a moment', async () => {
      const license = new MomentLicenseEntity();
      license.price = 29.99;

      mockMomentsService.findLicensesByMomentId.mockResolvedValue([license]);

      const response = await controller.findLicenses({ id: 'test-uuid' });

      expect(mockMomentsService.findLicensesByMomentId).toHaveBeenCalledWith('test-uuid');
      expect(response.result).toHaveLength(1);
      expect(response.message).toBe('Moment licenses retrieved successfully');
    });

    it('returns empty array when no licenses available', async () => {
      mockMomentsService.findLicensesByMomentId.mockResolvedValue([]);

      const response = await controller.findLicenses({ id: 'test-uuid' });

      expect(response.result).toHaveLength(0);
    });
  });

  describe('findOneById()', () => {
    it('returns full moment detail with photographer summary', async () => {
      const moment = new MomentEntity();
      moment.id = 'test-uuid';
      const momentWithSummary = Object.assign(moment, { photographerSummary: null });

      mockMomentsService.findOneById.mockResolvedValue(momentWithSummary);

      const response = await controller.findOneById({ id: 'test-uuid' });

      expect(mockMomentsService.findOneById).toHaveBeenCalledWith('test-uuid');
      expect(response.result).toEqual(momentWithSummary);
    });
  });
});
