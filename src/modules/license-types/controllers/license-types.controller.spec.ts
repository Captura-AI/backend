// DTOs
import { CreateLicenseTypeDto } from '../dtos/create-license-type.dto';
import { ListLicenseTypesDto } from '../dtos/list-license-types.dto';
import { UpdateLicenseTypeDto } from '../dtos/update-license-type.dto';

// Entities
import { LicenseTypeEntity } from '../entities/license-type.entity';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Controllers
import { LicenseTypesController } from './license-types.controller';

// Services
import { LicenseTypesService } from '../services/license-types.service';

const mockLicenseType = (): LicenseTypeEntity => {
  const lt = new LicenseTypeEntity();
  lt.id = 'lt-uuid-1';
  lt.name = 'Editorial';
  lt.description = 'For editorial use only';
  lt.usageRights = 'Credit required.';
  lt.isActive = true;
  return lt;
};

const mockAdminUser = (): IRequestUser => ({
  email: 'admin@test.com',
  id: 'admin-uuid-1',
  role: UserRoleEnum.ADMIN as TUserRole,
  username: 'admin',
});

describe('LicenseTypesController', () => {
  let controller: LicenseTypesController;
  let mockLicenseTypesService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    remove: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockLicenseTypesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicenseTypesController],
      providers: [
        {
          provide: LicenseTypesService,
          useValue: mockLicenseTypesService,
        },
      ],
    }).compile();

    controller = module.get<LicenseTypesController>(LicenseTypesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('calls service.create with dto and returns result', async () => {
      const lt = mockLicenseType();
      const user = mockAdminUser();
      const dto = new CreateLicenseTypeDto();
      dto.name = 'Editorial';

      mockLicenseTypesService.create.mockResolvedValue(lt);

      const response = await controller.create(user, dto);

      expect(mockLicenseTypesService.create).toHaveBeenCalledWith(dto);
      expect(response).toEqual({
        message: 'License type created successfully',
        result: lt,
      });
    });
  });

  describe('findAll()', () => {
    it('calls service.findAll with query and returns result', async () => {
      const paginatedResult = { data: [mockLicenseType()], limit: 10, offset: 1, total: 1 };
      const query = new ListLicenseTypesDto();

      mockLicenseTypesService.findAll.mockResolvedValue(paginatedResult);

      const response = await controller.findAll(query);

      expect(mockLicenseTypesService.findAll).toHaveBeenCalledWith(query);
      expect(response).toEqual({
        message: 'License types retrieved successfully',
        result: paginatedResult,
      });
    });
  });

  describe('findById()', () => {
    it('calls service.findById with param id and returns result', async () => {
      const lt = mockLicenseType();
      mockLicenseTypesService.findById.mockResolvedValue(lt);

      const response = await controller.findById({ id: 'lt-uuid-1' });

      expect(mockLicenseTypesService.findById).toHaveBeenCalledWith('lt-uuid-1');
      expect(response).toEqual({
        message: 'License type retrieved successfully',
        result: lt,
      });
    });
  });

  describe('update()', () => {
    it('calls service.update with id and dto, returns result', async () => {
      const lt = mockLicenseType();
      const user = mockAdminUser();
      const dto = new UpdateLicenseTypeDto();
      dto.name = 'Commercial';

      mockLicenseTypesService.update.mockResolvedValue({ ...lt, name: 'Commercial' });

      const response = await controller.update(user, { id: 'lt-uuid-1' }, dto);

      expect(mockLicenseTypesService.update).toHaveBeenCalledWith('lt-uuid-1', dto);
      expect(response.message).toBe('License type updated successfully');
    });
  });

  describe('remove()', () => {
    it('calls service.remove with id and returns void', async () => {
      const user = mockAdminUser();
      mockLicenseTypesService.remove.mockResolvedValue(undefined);

      const response = await controller.remove(user, { id: 'lt-uuid-1' });

      expect(mockLicenseTypesService.remove).toHaveBeenCalledWith('lt-uuid-1');
      expect(response).toBeUndefined();
    });
  });
});
