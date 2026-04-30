// DTOs
import { CreateLicenseTypeDto } from '../dtos/create-license-type.dto';
import { ListLicenseTypesDto } from '../dtos/list-license-types.dto';
import { UpdateLicenseTypeDto } from '../dtos/update-license-type.dto';

// Entities
import { LicenseTypeEntity } from '../entities/license-type.entity';

// NestJS Libraries
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { LicenseTypesService } from './license-types.service';

const mockLicenseType = (): LicenseTypeEntity => {
  const lt = new LicenseTypeEntity();
  lt.id = 'lt-uuid-1';
  lt.name = 'Editorial';
  lt.description = 'For editorial use only';
  lt.usageRights = 'Credit required. Non-commercial use only.';
  lt.isActive = true;
  lt.deletedAt = null;
  return lt;
};

describe('LicenseTypesService', () => {
  let service: LicenseTypesService;
  let mockRepo: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseTypesService,
        {
          provide: getRepositoryToken(LicenseTypeEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<LicenseTypesService>(LicenseTypesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('creates and returns a new license type', async () => {
      const lt = mockLicenseType();

      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(lt);

      const dto = new CreateLicenseTypeDto();
      dto.name = 'Editorial';
      dto.description = 'For editorial use only';
      dto.usageRights = 'Credit required.';

      const result = await service.create(dto);

      expect(result).toEqual(lt);
      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ name: 'Editorial' }) }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when name already exists', async () => {
      mockRepo.findOne.mockResolvedValue(mockLicenseType());

      const dto = new CreateLicenseTypeDto();
      dto.name = 'Editorial';

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll()', () => {
    it('returns paginated license types', async () => {
      const lts = [mockLicenseType()];
      mockRepo.findAndCount.mockResolvedValue([lts, 1]);

      const dto = new ListLicenseTypesDto();
      dto.limit = 10;
      dto.offset = 1;

      const result = await service.findAll(dto);

      expect(result.data).toEqual(lts);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(1);
    });

    it('filters by isActive when provided', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const dto = new ListLicenseTypesDto();
      dto.isActive = false;

      await service.findAll(dto);

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: false }) }),
      );
    });

    it('returns empty result when no license types exist', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(new ListLicenseTypesDto());

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findById()', () => {
    it('returns the license type when found', async () => {
      const lt = mockLicenseType();
      mockRepo.findOne.mockResolvedValue(lt);

      const result = await service.findById('lt-uuid-1');

      expect(result).toEqual(lt);
      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'lt-uuid-1' }) }),
      );
    });

    it('throws NotFoundException when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('updates and returns the license type', async () => {
      const lt = mockLicenseType();
      const updated = { ...lt, name: 'Commercial' } as LicenseTypeEntity;

      mockRepo.findOne.mockResolvedValueOnce(lt).mockResolvedValueOnce(null);
      mockRepo.save.mockResolvedValue(updated);

      const dto = new UpdateLicenseTypeDto();
      dto.name = 'Commercial';

      const result = await service.update('lt-uuid-1', dto);

      expect(result.name).toBe('Commercial');
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('throws ConflictException when new name already taken by another type', async () => {
      const lt = mockLicenseType();
      const conflicting = {
        ...mockLicenseType(),
        id: 'lt-uuid-2',
        name: 'Commercial',
      } as LicenseTypeEntity;

      mockRepo.findOne.mockResolvedValueOnce(lt).mockResolvedValueOnce(conflicting);

      const dto = new UpdateLicenseTypeDto();
      dto.name = 'Commercial';

      await expect(service.update('lt-uuid-1', dto)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when license type does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const dto = new UpdateLicenseTypeDto();
      dto.name = 'Commercial';

      await expect(service.update('non-existent', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('soft-deletes the license type by setting deletedAt', async () => {
      const lt = mockLicenseType();
      mockRepo.findOne.mockResolvedValue(lt);
      mockRepo.update.mockResolvedValue(undefined);

      await service.remove('lt-uuid-1');

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: 'lt-uuid-1' },
        expect.objectContaining({ deletedAt: expect.any(Number) }),
      );
    });

    it('throws NotFoundException when license type does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
