// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import type { CreateLicenseTypeDto } from '../dtos/create-license-type.dto';
import type { ListLicenseTypesDto } from '../dtos/list-license-types.dto';
import type { UpdateLicenseTypeDto } from '../dtos/update-license-type.dto';

// Entities
import { LicenseTypeEntity } from '../entities/license-type.entity';

// NestJS Libraries
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// TypeORM
import { IsNull, Repository, type FindOptionsWhere } from 'typeorm';

export interface ILicenseTypesResult {
  data: LicenseTypeEntity[];
  limit: number;
  offset: number;
  total: number;
}

@Injectable()
export class LicenseTypesService {
  constructor(
    @InjectRepository(LicenseTypeEntity)
    private readonly _licenseTypeRepository: Repository<LicenseTypeEntity>,
  ) {}

  public async create(dto: CreateLicenseTypeDto): Promise<LicenseTypeEntity> {
    const existing = await this._licenseTypeRepository.findOne({
      where: { deletedAt: IsNull(), name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`License type with name "${dto.name}" already exists.`);
    }

    try {
      const licenseType = new LicenseTypeEntity();

      licenseType.description = dto.description ?? null;
      licenseType.isActive = dto.isActive ?? true;
      licenseType.name = dto.name;
      licenseType.usageRights = dto.usageRights ?? null;

      return await this._licenseTypeRepository.save(licenseType);
    } catch (error: unknown) {
      if (error instanceof ConflictException) throw error;

      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  public async findAll(dto: ListLicenseTypesDto): Promise<ILicenseTypesResult> {
    const limit = dto.limit ?? 10;
    const offset = dto.offset ?? 1;

    const where: FindOptionsWhere<LicenseTypeEntity> = { deletedAt: IsNull() };

    if (dto.isActive !== undefined) {
      where.isActive = dto.isActive;
    }

    const [data, total] = await this._licenseTypeRepository.findAndCount({
      order: { name: 'ASC' },
      skip: dto.skip,
      take: limit,
      where,
    });

    return { data, limit, offset, total };
  }

  public async findById(id: string): Promise<LicenseTypeEntity> {
    const licenseType = await this._licenseTypeRepository.findOne({
      where: { deletedAt: IsNull(), id },
    });

    if (!licenseType) {
      throw new NotFoundException(`License type with id ${id} not found.`);
    }

    return licenseType;
  }

  public async update(id: string, dto: UpdateLicenseTypeDto): Promise<LicenseTypeEntity> {
    const licenseType = await this.findById(id);

    if (dto.name !== undefined && dto.name !== licenseType.name) {
      const conflict = await this._licenseTypeRepository.findOne({
        where: { deletedAt: IsNull(), name: dto.name },
      });

      if (conflict) {
        throw new ConflictException(`License type with name "${dto.name}" already exists.`);
      }
    }

    try {
      if (dto.description !== undefined) licenseType.description = dto.description ?? null;
      if (dto.isActive !== undefined) licenseType.isActive = dto.isActive;
      if (dto.name !== undefined) licenseType.name = dto.name;
      if (dto.usageRights !== undefined) licenseType.usageRights = dto.usageRights ?? null;

      return await this._licenseTypeRepository.save(licenseType);
    } catch (error: unknown) {
      if (error instanceof ConflictException || error instanceof NotFoundException) throw error;

      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  public async remove(id: string): Promise<void> {
    await this.findById(id);

    await this._licenseTypeRepository.update({ id }, { deletedAt: Math.floor(Date.now() / 1000) });
  }
}
