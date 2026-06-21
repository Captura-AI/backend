// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Controller & Service
import { HotspotsController } from './hotspots.controller';
import { HotspotsService } from '../services/hotspots.service';

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('HotspotsController', () => {
  let controller: HotspotsController;
  let mockService: {
    findHotspotPage: jest.Mock;
    findHotspotDetailBySlug: jest.Mock;
  };

  beforeEach(async () => {
    mockService = {
      findHotspotDetailBySlug: jest.fn(),
      findHotspotPage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HotspotsController],
      providers: [{ provide: HotspotsService, useValue: mockService }],
    }).compile();

    controller = module.get<HotspotsController>(HotspotsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findHotspotPage()', () => {
    it('delegates to service.findHotspotPage and returns map data', async () => {
      const mapData = { hotspots: [], stats: { totalMoments: 0, totalHotspots: 0 } };
      mockService.findHotspotPage.mockResolvedValue(mapData);

      const response = await controller.findHotspotPage();

      expect(mockService.findHotspotPage).toHaveBeenCalledTimes(1);
      expect(response).toEqual({
        message: 'Hotspot map retrieved successfully',
        result: mapData,
      });
    });
  });

  describe('findBySlug()', () => {
    it('delegates to service.findHotspotDetailBySlug with slug param', async () => {
      const detail = { id: 'hotspot-uuid-1', slug: 'jakarta-selatan', name: 'Jakarta Selatan' };
      mockService.findHotspotDetailBySlug.mockResolvedValue(detail);

      const response = await controller.findBySlug('jakarta-selatan');

      expect(mockService.findHotspotDetailBySlug).toHaveBeenCalledWith('jakarta-selatan');
      expect(response).toEqual({
        message: 'Hotspot detail retrieved successfully',
        result: detail,
      });
    });
  });
});
