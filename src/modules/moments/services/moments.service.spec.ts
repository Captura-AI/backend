// DTOs
import { SearchMomentDto } from '../dtos/search-moment.dto';
import { TimeOfDayEnum } from '../dtos/time-filter.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';

// Enums
import { VehicleTypeEnum } from '../enums/vehicle-type.enum';

// NestJS Libraries
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { MomentsService } from './moments.service';

const buildMockQueryBuilder = (data: MomentEntity[], total: number) => {
  const qb: Record<string, jest.Mock> = {
    addSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    cache: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    getMany: jest.fn().mockResolvedValue(data),
    getRawMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
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
  return entity;
};

describe('MomentsService', () => {
  let service: MomentsService;
  let mockRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    mockRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MomentsService,
        {
          provide: getRepositoryToken(MomentEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MomentsService>(MomentsService);
  });

  describe('search()', () => {
    it('returns paginated results with no filters', async () => {
      const moment = mockMoment();
      const qb = buildMockQueryBuilder([moment], 1);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      const result = await service.search(filters);

      expect(result.content).toHaveLength(1);
      expect(result.meta.totalData).toBe(1);
      expect(qb.andWhere).toHaveBeenCalledWith('moments.deleted_at IS NULL');
    });

    it('applies city filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.location = { city: 'Jakarta' };

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('moments.city ILIKE :city', {
        city: '%Jakarta%',
      });
    });

    it('applies district filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.location = { district: 'Kebayoran' };

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('moments.district ILIKE :district', {
        district: '%Kebayoran%',
      });
    });

    it('applies vehicleTypes filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.vehicleTypes = [VehicleTypeEnum.CAR, VehicleTypeEnum.MOTORCYCLE];

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('moments.vehicle_type IN (:...vehicleTypes)', {
        vehicleTypes: [VehicleTypeEnum.CAR, VehicleTypeEnum.MOTORCYCLE],
      });
    });

    it('applies licensePlate partial match filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.licensePlate = 'B 1234';

      await service.search(filters);

      expect(qb.andWhere).toHaveBeenCalledWith('moments.license_plate ILIKE :plate', {
        plate: '%B 1234%',
      });
    });

    it('applies timeRange from/to filter', async () => {
      const qb = buildMockQueryBuilder([mockMoment()], 1);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

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
      mockRepository.createQueryBuilder.mockReturnValue(qb);

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
      mockRepository.createQueryBuilder.mockReturnValue(qb);

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

    it('returns empty paginated result when no moments match', async () => {
      const qb = buildMockQueryBuilder([], 0);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const filters = new SearchMomentDto();
      filters.location = { city: 'NonExistentCity' };

      const result = await service.search(filters);

      expect(result.content).toHaveLength(0);
      expect(result.meta.totalData).toBe(0);
    });

    it('throws BadRequestException on repository error', async () => {
      const qb = buildMockQueryBuilder([], 0);
      (qb.getManyAndCount as jest.Mock).mockRejectedValue(new Error('DB connection lost'));
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.search(new SearchMomentDto())).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOneById()', () => {
    it('returns the moment when found', async () => {
      const moment = mockMoment();
      mockRepository.findOne.mockResolvedValue(moment);

      const result = await service.findOneById('test-uuid-1234');

      expect(result).toEqual(moment);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-uuid-1234', deletedAt: undefined },
      });
    });

    it('throws NotFoundException when moment does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findRecent()', () => {
    it('returns moments sorted by capturedAt DESC', async () => {
      const moment = mockMoment();
      const qb = buildMockQueryBuilder([moment], 1);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findRecent(5);

      expect(qb.orderBy).toHaveBeenCalledWith('moments.captured_at', 'DESC');
      expect(qb.take).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });

    it('uses default limit of 10', async () => {
      const qb = buildMockQueryBuilder([], 0);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findRecent();

      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('filters out soft-deleted moments', async () => {
      const qb = buildMockQueryBuilder([], 0);
      mockRepository.createQueryBuilder.mockReturnValue(qb);

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
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFacets();

      expect(result.cities).toHaveLength(2);
      expect(result.cities[0]).toEqual({ count: 15, label: 'Jakarta' });
      expect(result.vehicleTypes).toHaveLength(1);
      expect(result.vehicleTypes[0]).toEqual({ count: 10, label: VehicleTypeEnum.CAR });
    });
  });
});
