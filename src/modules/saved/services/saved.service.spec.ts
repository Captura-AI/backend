// DTOs
import type { CreateSavedSearchDto } from '../dtos/create-saved-search.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import type { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { PhotographerProfileEntity } from '../../photographers/entities/photographer-profile.entity';
import { SavedMomentEntity } from '../entities/saved-moment.entity';
import { SavedSearchEntity } from '../entities/saved-search.entity';

// NestJS Libraries
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { SavedService } from './saved.service';

const mockMoment = (): MomentEntity => {
  const profile = new PhotographerProfileEntity();
  profile.artistName = 'Reza Ardiansyah';

  const moment = new MomentEntity();
  moment.id = 'moment-uuid-1';
  moment.caption = 'A vintage Vespa parked in the gold light';
  moment.capturedAt = 1700000000;
  moment.city = 'Bandung';
  moment.slug = 'a-vintage-vespa';
  moment.imageUrl = 'https://example.test/vespa.jpg';
  moment.thumbnailUrl = null;
  moment.licensePlate = 'D 1428 NA';
  moment.deletedAt = null;
  moment.photographerProfile = profile;
  moment.licenses = [
    { currency: 'USD', deletedAt: null, isActive: true, price: 35 } as MomentLicenseEntity,
    { currency: 'USD', deletedAt: null, isActive: true, price: 42 } as MomentLicenseEntity,
  ];
  return moment;
};

const mockSavedMoment = (): SavedMomentEntity => {
  const saved = new SavedMomentEntity();
  saved.id = 'saved-uuid-1';
  saved.userId = 'user-uuid-1';
  saved.momentId = 'moment-uuid-1';
  saved.createdAt = 1700000500;
  saved.deletedAt = null;
  saved.moment = mockMoment();
  return saved;
};

describe('SavedService', () => {
  let service: SavedService;
  let mockSavedMomentRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockSavedSearchRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockMomentRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    mockSavedMomentRepo = {
      find: jest.fn().mockResolvedValue([mockSavedMoment()]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((entity: SavedMomentEntity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockSavedSearchRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((entity: SavedSearchEntity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockMomentRepo = {
      findOne: jest.fn().mockResolvedValue(mockMoment()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SavedService,
        { provide: getRepositoryToken(SavedMomentEntity), useValue: mockSavedMomentRepo },
        { provide: getRepositoryToken(SavedSearchEntity), useValue: mockSavedSearchRepo },
        { provide: getRepositoryToken(MomentEntity), useValue: mockMomentRepo },
      ],
    }).compile();

    service = module.get<SavedService>(SavedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listSavedMoments', () => {
    it('maps saved moments to display-safe items with the lowest USD price', async () => {
      const items = await service.listSavedMoments('user-uuid-1');

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        momentId: 'moment-uuid-1',
        photographerName: 'Reza Ardiansyah',
        priceUsd: 35,
        title: 'A vintage Vespa parked in the gold light',
      });
    });

    it('never leaks the license plate into saved moment items', async () => {
      const items = await service.listSavedMoments('user-uuid-1');

      expect(items[0]).not.toHaveProperty('licensePlate');
      expect(JSON.stringify(items)).not.toContain('1428');
    });

    it('only queries bookmarks owned by the user', async () => {
      await service.listSavedMoments('user-uuid-1');

      expect(mockSavedMomentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-uuid-1' }) }),
      );
    });
  });

  describe('saveMoment', () => {
    it('creates a bookmark when none exists', async () => {
      const result = await service.saveMoment('user-uuid-1', 'moment-uuid-1');

      expect(mockSavedMomentRepo.save).toHaveBeenCalled();
      expect(result.userId).toBe('user-uuid-1');
      expect(result.momentId).toBe('moment-uuid-1');
    });

    it('returns the existing bookmark without duplicating', async () => {
      const existing = mockSavedMoment();
      mockSavedMomentRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.saveMoment('user-uuid-1', 'moment-uuid-1');

      expect(result).toBe(existing);
      expect(mockSavedMomentRepo.save).not.toHaveBeenCalled();
    });

    it('restores a previously removed bookmark', async () => {
      const removed = mockSavedMoment();
      removed.deletedAt = 1699999999;
      mockSavedMomentRepo.findOne.mockResolvedValueOnce(removed);

      const result = await service.saveMoment('user-uuid-1', 'moment-uuid-1');

      expect(result.deletedAt).toBeNull();
      expect(mockSavedMomentRepo.save).toHaveBeenCalledWith(removed);
    });

    it('throws NotFoundException when the moment does not exist', async () => {
      mockMomentRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.saveMoment('user-uuid-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('removeSavedMoment', () => {
    it('throws NotFoundException when the bookmark is missing or not owned', async () => {
      mockSavedMomentRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.removeSavedMoment('user-uuid-1', 'moment-uuid-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createSavedSearch', () => {
    it('persists the search with normalized filters and a result snapshot', async () => {
      const dto: CreateSavedSearchDto = {
        filters: [{ key: 'location', keyLabel: 'where', value: 'Braga, Bandung' }],
        label: 'Silver Vespa near Braga',
        query: 'silver vespa',
        resultCount: 34,
      };

      const result = await service.createSavedSearch('user-uuid-1', dto);

      expect(mockSavedSearchRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({
        filters: [{ key: 'location', keyLabel: 'where', value: 'Braga, Bandung' }],
        label: 'Silver Vespa near Braga',
        resultCount: 34,
      });
    });
  });

  describe('removeSavedSearch', () => {
    it('throws NotFoundException when the saved search is missing or not owned', async () => {
      mockSavedSearchRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.removeSavedSearch('user-uuid-1', 'search-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
