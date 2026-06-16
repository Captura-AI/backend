// Entities
import { HotspotEntity } from '../entities/hotspot.entity';
import { MomentEntity } from '../../moments/entities/moments.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// NestJS Libraries
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { HotspotsService } from './hotspots.service';

const mockHotspot = (): HotspotEntity => {
  const hotspot = new HotspotEntity();
  hotspot.id = 'hotspot-uuid-1';
  hotspot.slug = 'braga';
  hotspot.name = 'Braga, Bandung';
  hotspot.region = 'Jawa Barat';
  hotspot.regionCode = 'ID';
  hotspot.latitude = -6.9175;
  hotspot.longitude = 107.6098;
  hotspot.title = 'Braga, Bandung — <em>colonial heart</em>.';
  hotspot.meta = 'The colonial stretch of Jalan Braga.';
  hotspot.description = 'Colonial-era façades and slow afternoon traffic.';
  hotspot.heroImageUrl = 'https://example.test/braga.jpg';
  hotspot.bestTimeLabel = 'Golden hour';
  hotspot.bestTimeWindow = '17:00 – 18:30';
  hotspot.popularTags = ['red jacket', 'vespa'];
  hotspot.areaKeywords = ['braga', 'bandung'];
  hotspot.displayOrder = 0;
  hotspot.isActive = true;
  hotspot.isDefault = true;
  hotspot.deletedAt = null;
  return hotspot;
};

const mockMoment = (): MomentEntity => {
  const photographer = new UsersEntity();
  photographer.id = 'user-uuid-1';
  photographer.name = 'Sari Pradipta';
  photographer.avatar = 'https://example.test/sari.jpg';

  const moment = new MomentEntity();
  moment.id = 'moment-uuid-1';
  moment.caption = 'A red jacket under the awnings.';
  moment.capturedAt = 1700000000;
  moment.createdAt = 1700000000;
  moment.city = 'Bandung';
  moment.district = 'Braga';
  moment.imageUrl = 'https://example.test/moment.jpg';
  moment.thumbnailUrl = null;
  moment.licensePlate = 'B 1234 ABC';
  moment.tags = ['red', 'braga'];
  moment.photographer = photographer;
  moment.deletedAt = null;
  return moment;
};

interface IQueryBuilderMock {
  select: jest.Mock;
  addSelect: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  take: jest.Mock;
  setParameters: jest.Mock;
  getRawOne: jest.Mock;
  getMany: jest.Mock;
}

const buildIQueryBuilderMock = (): IQueryBuilderMock => {
  const qb = {
    addSelect: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn().mockResolvedValue([mockMoment()]),
    getRawOne: jest.fn().mockResolvedValue({
      active: '1',
      activePhotographers: '1',
      last15: '1',
      momentsToday: '2',
      total: '3',
    }),
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    select: jest.fn(),
    setParameters: jest.fn(),
    take: jest.fn(),
    where: jest.fn(),
  } as unknown as IQueryBuilderMock;

  qb.addSelect.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  qb.leftJoinAndSelect.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.select.mockReturnValue(qb);
  qb.setParameters.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);

  return qb;
};

describe('HotspotsService', () => {
  let service: HotspotsService;
  let mockHotspotRepo: { find: jest.Mock; findOne: jest.Mock };
  let mockMomentRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    mockHotspotRepo = {
      find: jest.fn().mockResolvedValue([mockHotspot()]),
      findOne: jest.fn().mockResolvedValue(mockHotspot()),
    };
    mockMomentRepo = {
      createQueryBuilder: jest.fn(() => buildIQueryBuilderMock()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotspotsService,
        { provide: getRepositoryToken(HotspotEntity), useValue: mockHotspotRepo },
        { provide: getRepositoryToken(MomentEntity), useValue: mockMomentRepo },
      ],
    }).compile();

    service = module.get<HotspotsService>(HotspotsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findHotspotPage', () => {
    it('returns region metadata, summaries, and a feed aggregated from real moments', async () => {
      const page = await service.findHotspotPage();

      expect(page.region).toBe('Jawa Barat');
      expect(page.defaultHotspotId).toBe('braga');
      expect(page.hotspots).toHaveLength(1);
      expect(page.hotspots[0]).toMatchObject({ id: 'braga', slug: 'braga', total: 3 });
      expect(page.feedMoments).toHaveLength(1);
      expect(page.regionStats.momentsCapturedToday).toBe(2);
    });

    it('derives "hot" level when activity crosses the threshold', async () => {
      const page = await service.findHotspotPage();

      // mock stats: active=1, last15=1 → below hot thresholds → warm
      expect(page.hotspots[0].level).toBe('warm');
    });

    it('never leaks license plate data into the public feed', async () => {
      const page = await service.findHotspotPage();

      expect(page.feedMoments[0]).not.toHaveProperty('licensePlate');
      expect(JSON.stringify(page.feedMoments)).not.toContain('1234');
    });

    it('maps active photographers without duplicates', async () => {
      const page = await service.findHotspotPage();

      expect(page.activePhotographers).toEqual([
        { avatarUrl: 'https://example.test/sari.jpg', id: 'user-uuid-1', name: 'Sari Pradipta' },
      ]);
    });
  });

  describe('findHotspotDetailBySlug', () => {
    it('returns the curated detail enriched with live stats', async () => {
      const detail = await service.findHotspotDetailBySlug('braga');

      expect(detail.slug).toBe('braga');
      expect(detail.bestTimeLabel).toBe('Golden hour');
      expect(detail.popularTags).toEqual(['red jacket', 'vespa']);
      expect(detail.stats.total).toBe(3);
      expect(detail.latestMoments[0]).not.toHaveProperty('licensePlate');
    });

    it('throws NotFoundException when the slug is unknown', async () => {
      mockHotspotRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findHotspotDetailBySlug('unknown')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
