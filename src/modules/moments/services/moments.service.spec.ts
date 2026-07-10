// DTOs
import { SearchMomentDto } from '../dtos/search-moment.dto';
import { TimeOfDayEnum } from '../dtos/time-filter.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';
import { MomentLicenseEntity } from '../entities/moment-license.entity';
import { PhotographerProfileEntity } from '../../photographers/entities/photographer-profile.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';
import { VehicleTypeEnum } from '../enums/vehicle-type.enum';

// NestJS Libraries
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { AiAnalysisService } from './ai-analysis.service';
import { MomentsService } from './moments.service';

const buildMockQueryBuilder = (data: MomentEntity[], total: number) => {
  const qb: Record<string, jest.Mock> = {
    addOrderBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    cache: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    getMany: jest.fn().mockResolvedValue(data),
    getOne: jest.fn().mockResolvedValue(data[0] ?? null),
    getRawMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  };

  return qb;
};

const mockMoment = (): MomentEntity => {
  const entity = new MomentEntity();
  entity.id = 'test-uuid-1234';
  entity.city = 'Jakarta';
  entity.vehicleType = VehicleTypeEnum.CAR;
  entity.capturedAt = 1700000000;
  entity.deletedAt = null;
  entity.photographerProfileId = null;
  entity.photographerProfile = null;
  return entity;
};

describe('MomentsService', () => {
  let service: MomentsService;
  let mockMomentsRepository: {
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    exists: jest.Mock;
    findOne: jest.Mock;
  };
  let mockLicensesRepository: {
    find: jest.Mock;
  };
  let mockAiAnalysisService: {
    embedTextQuery: jest.Mock;
  };

  beforeEach(async () => {
    mockMomentsRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      exists: jest.fn(),
      findOne: jest.fn(),
    };

    mockLicensesRepository = {
      find: jest.fn(),
    };

    mockAiAnalysisService = {
      embedTextQuery: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MomentsService,
        {
          provide: getRepositoryToken(MomentEntity),
          useValue: mockMomentsRepository,
        },
        {
          provide: getRepositoryToken(MomentLicenseEntity),
          useValue: mockLicensesRepository,
        },
        {
          provide: AiAnalysisService,
          useValue: mockAiAnalysisService,
        },
      ],
    }).compile();

    service = module.get<MomentsService>(MomentsService);
  });

  describe('search()', () => {
    it('returns paginated results with no filters', async () => {
      const moment = mockMoment();
      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      const result = await service.search(filters);

      expect(result.content).toHaveLength(1);
      expect(result.meta.totalData).toBe(1);
      expect(qb.andWhere).toHaveBeenCalledWith('moments.deleted_at IS NULL');
    });

    it('applies city filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.location = { city: 'Jakarta' };

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('moments.city ILIKE :city', {
        city: '%Jakarta%',
      });
    });

    it('applies district filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.location = { district: 'Kebayoran' };

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('moments.district ILIKE :district', {
        district: '%Kebayoran%',
      });
    });

    it('applies vehicleTypes filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.vehicleTypes = [VehicleTypeEnum.CAR, VehicleTypeEnum.MOTORCYCLE];

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('moments.vehicle_type IN (:...vehicleTypes)', {
        vehicleTypes: [VehicleTypeEnum.CAR, VehicleTypeEnum.MOTORCYCLE],
      });
    });

    it('applies normalized and fuzzy licensePlate match filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.licensePlate = 'B 1234';

      await service.search(filters);

      const callArgs = (qb.andWhere as jest.Mock).mock.calls;
      const plateCall = callArgs.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.includes('similarity'),
      );
      expect(plateCall).toBeDefined();
      expect(plateCall[1]).toEqual(
        expect.objectContaining({
          canonicalPlate: '81234',
          maxPlateDistance: 2,
          plate: 'B1234',
          platePattern: '%B1234%',
        }),
      );
      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('levenshtein_less_equal'),
        'plate_match_score',
      );
      expect(qb.orderBy).toHaveBeenCalledWith('plate_match_score', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('moments.capturedAt', 'DESC');
    });

    it('keeps short licensePlate queries on exact or partial matching only', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.licensePlate = 'B 1';

      await service.search(filters);

      const callArgs = (qb.andWhere as jest.Mock).mock.calls;
      const plateCall = callArgs.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.includes('LIKE :platePattern'),
      );

      expect(plateCall).toBeDefined();
      expect(plateCall[0]).not.toContain('levenshtein_less_equal');
      expect(plateCall[1]).toEqual({
        plate: 'B1',
        platePattern: '%B1%',
      });
    });

    it('applies timeRange from/to filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.timeRange = { from: 1700000000, to: 1700100000 };

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('>= :from'), {
        from: 1700000000,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('<= :to'), {
        to: 1700100000,
      });
    });

    it('applies timeOfDay morning filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.timeRange = { timeOfDay: TimeOfDayEnum.MORNING };

      await service.search(filters);

      const callArgs = (qb.andWhere as jest.Mock).mock.calls;
      const timeOfDayCall = callArgs.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.includes('EXTRACT(HOUR'),
      );
      expect(timeOfDayCall).toBeDefined();
      expect(timeOfDayCall[1]).toEqual({ todEnd: 10, todStart: 5 });
    });

    it('applies text query filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.query = 'sunset';

      await service.search(filters);

      const callArgs = (qb.andWhere as jest.Mock).mock.calls;
      const queryCall = callArgs.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.includes('ILIKE :searchQuery'),
      );
      expect(queryCall).toBeDefined();
      expect(queryCall[1]).toEqual({ searchQuery: '%sunset%' });
    });

    it('uses semantic vector ordering when text embedding is available', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);
      mockAiAnalysisService.embedTextQuery.mockResolvedValue([0.1].concat(Array(511).fill(0.2)));

      const filters = new SearchMomentDto();
      filters.query = 'black motorcycle';

      await service.search(filters);

      expect(qb.addSelect).toHaveBeenCalledWith(
        'moments.embedding_vector <=> :queryEmbedding::vector',
        'semantic_distance',
      );
      expect(qb.setParameter).toHaveBeenCalledWith(
        'queryEmbedding',
        expect.stringMatching(/^\[0\.1,0\.2/),
      );
      expect(qb.orderBy).toHaveBeenCalledWith('semantic_distance', 'ASC');
    });

    it('returns empty paginated result when no moments match', async () => {
      const qb = buildMockQueryBuilder([], 0);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.location = { city: 'NonExistentCity' };

      const result = await service.search(filters);

      expect(result.content).toHaveLength(0);
      expect(result.meta.totalData).toBe(0);
    });

    it('throws BadRequestException on repository error', async () => {
      const qb = buildMockQueryBuilder([], 0);
      (qb.getManyAndCount as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.search(new SearchMomentDto())).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchWithMatches()', () => {
    it('labels exact plate matches above other match signals', async () => {
      const moment = mockMoment();
      moment.caption = 'Sunday ride';
      moment.embeddingVector = [0.1];
      moment.licensePlate = 'B 1234 ABC';

      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.licensePlate = 'B1234ABC';
      filters.query = 'Sunday';

      const result = await service.searchWithMatches(filters);

      expect(result.content[0]?.match).toEqual({
        isPlateMatch: true,
        isSemanticMatch: false,
        label: 'plate-exact',
        score: 1,
      });
      expect(result.content[0]?.moment.licensePlate).toBe('B ***BC');
    });

    it('labels partial plate matches for prefix searches', async () => {
      const moment = mockMoment();
      moment.licensePlate = 'B 1234 ABC';

      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.licensePlate = 'B 1234';

      const result = await service.searchWithMatches(filters);

      expect(result.content[0]?.match.label).toBe('plate-partial');
      expect(result.content[0]?.match.score).toBe(0.86);
    });

    it('labels OCR-confused plate matches as fuzzy', async () => {
      const moment = mockMoment();
      moment.licensePlate = 'B 1234 ABC';

      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.licensePlate = '8 1234 A8C';

      const result = await service.searchWithMatches(filters);

      expect(result.content[0]?.match).toEqual({
        isPlateMatch: true,
        isSemanticMatch: false,
        label: 'plate-fuzzy',
        score: 0.84,
      });
    });
  });

  describe('findOneById()', () => {
    it('returns moment with null photographerSummary when no profile linked', async () => {
      const moment = mockMoment();
      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOneById('test-uuid-1234');

      expect(result.id).toBe('test-uuid-1234');
      expect(result.photographerSummary).toBeNull();
    });

    it('throws NotFoundException when moment does not exist', async () => {
      const qb = buildMockQueryBuilder([], 0);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOneById('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('includes photographer summary when profile is linked', async () => {
      const moment = mockMoment();
      const photographerProfile = new PhotographerProfileEntity();
      const photographerUser = new UsersEntity();

      photographerUser.avatar = 'https://example.com/avatar.jpg';
      photographerProfile.id = 'profile-uuid';
      photographerProfile.artistName = 'Ansel Adams';
      photographerProfile.bio = 'Landscape photographer';
      photographerProfile.location = 'Yosemite';
      photographerProfile.user = photographerUser;
      moment.photographerProfileId = 'profile-uuid';
      moment.photographerProfile = photographerProfile;

      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);
      mockMomentsRepository.count.mockResolvedValue(42);

      const result = await service.findOneById('test-uuid-1234');

      expect(result.photographerSummary).not.toBeNull();
      expect(result.photographerSummary?.artistName).toBe('Ansel Adams');
      expect(result.photographerSummary?.totalMoments).toBe(42);
      expect(result.photographerSummary?.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('masks plate + strips embedding/PII from aiAnalysis and photographer relations', async () => {
      const moment = mockMoment();
      const photographerUser = new UsersEntity();

      photographerUser.id = 'photographer-uuid';
      photographerUser.name = 'Rama Pratama';
      photographerUser.avatar = 'https://example.com/avatar.jpg';
      photographerUser.email = 'rama@captura.test';
      photographerUser.googleId = 'google-123';
      photographerUser.role = UserRoleEnum.PHOTOGRAPHER;
      moment.photographer = photographerUser;
      moment.licensePlate = 'D4872ABH';
      moment.embeddingVector = [0.1, 0.2, 0.3];
      moment.aiAnalysis = {
        embedding: [0.1, 0.2, 0.3],
        license_plate: 'D4872ABH',
        vehicles: [{ license_plate: 'D4872ABH', vehicle_type: 'MOTORCYCLE' }],
      };

      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOneById('test-uuid-1234');

      expect(result.licensePlate).toBe('D4***BH');
      expect(result.embeddingVector).toBeNull();
      expect(result.aiAnalysis).not.toHaveProperty('embedding');
      expect(result.aiAnalysis?.['license_plate']).toBe('D4***BH');
      expect(
        (result.aiAnalysis?.['vehicles'] as Array<{ license_plate: string }>)[0]?.license_plate,
      ).toBe('D4***BH');
      expect(result.photographer).toEqual({
        avatar: 'https://example.com/avatar.jpg',
        id: 'photographer-uuid',
        name: 'Rama Pratama',
        role: 'photographer',
      });
      expect(result.photographer).not.toHaveProperty('email');
      expect(result.photographer).not.toHaveProperty('googleId');
    });
  });

  describe('findSimilar()', () => {
    it('throws NotFoundException when source moment does not exist', async () => {
      mockMomentsRepository.findOne.mockResolvedValue(null);

      await expect(service.findSimilar('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('returns similar moments based on city and vehicleType', async () => {
      const source = mockMoment();
      mockMomentsRepository.findOne.mockResolvedValue(source);

      const similarMoment = mockMoment();
      similarMoment.id = 'similar-uuid';
      const qb = buildMockQueryBuilder([similarMoment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findSimilar('test-uuid-1234', 5);

      expect(mockMomentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-uuid-1234', deletedAt: undefined },
        select: ['id', 'city', 'embeddingVector', 'vehicleType'],
      });
      expect(qb.andWhere).toHaveBeenCalledWith('moments.id != :momentId', {
        momentId: 'test-uuid-1234',
      });
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });

    it('applies city condition when source has city', async () => {
      const source = mockMoment();
      source.city = 'Bandung';
      mockMomentsRepository.findOne.mockResolvedValue(source);

      const qb = buildMockQueryBuilder([], 0);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findSimilar('test-uuid-1234');

      const callArgs = (qb.andWhere as jest.Mock).mock.calls;
      const conditionCall = callArgs.find(
        ([sql]: [string]) => typeof sql === 'string' && sql.includes('moments.city = :city'),
      );
      expect(conditionCall).toBeDefined();
    });
  });

  describe('findLicensesByMomentId()', () => {
    it('throws NotFoundException when moment does not exist', async () => {
      mockMomentsRepository.exists.mockResolvedValue(false);

      await expect(service.findLicensesByMomentId('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns active licenses ordered by price ascending', async () => {
      mockMomentsRepository.exists.mockResolvedValue(true);

      const license = new MomentLicenseEntity();
      license.id = 'license-uuid';
      license.price = 29.99;
      license.isActive = true;

      mockLicensesRepository.find.mockResolvedValue([license]);

      const result = await service.findLicensesByMomentId('test-uuid-1234');

      expect(mockLicensesRepository.find).toHaveBeenCalledWith({
        where: { momentId: 'test-uuid-1234', isActive: true, deletedAt: undefined },
        order: { price: 'ASC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('license-uuid');
    });

    it('returns empty array when no active licenses exist', async () => {
      mockMomentsRepository.exists.mockResolvedValue(true);
      mockLicensesRepository.find.mockResolvedValue([]);

      const result = await service.findLicensesByMomentId('test-uuid-1234');

      expect(result).toHaveLength(0);
    });
  });

  describe('findRecent()', () => {
    it('returns moments sorted by capturedAt DESC', async () => {
      const moment = mockMoment();
      const qb = buildMockQueryBuilder([moment], 1);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findRecent(5);

      expect(qb.orderBy).toHaveBeenCalledWith('moments.captured_at', 'DESC');
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });

    it('uses default limit of 10', async () => {
      const qb = buildMockQueryBuilder([], 0);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findRecent();

      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('filters out soft-deleted moments', async () => {
      const qb = buildMockQueryBuilder([], 0);
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findRecent();

      expect(qb.where).toHaveBeenCalledWith('moments.deleted_at IS NULL');
    });
  });

  describe('getFacets()', () => {
    it('returns cities and vehicleTypes facets', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        cache: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValueOnce([
            { count: '15', label: 'Jakarta' },
            { count: '8', label: 'Bandung' },
          ])
          .mockResolvedValueOnce([{ count: '10', label: VehicleTypeEnum.CAR }]),
        groupBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };
      mockMomentsRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFacets();

      expect(result.cities).toHaveLength(2);
      expect(result.cities[0]).toEqual({ count: 15, label: 'Jakarta' });
      expect(result.vehicleTypes).toHaveLength(1);
      expect(result.vehicleTypes[0]).toEqual({ count: 10, label: VehicleTypeEnum.CAR });
    });
  });
});
