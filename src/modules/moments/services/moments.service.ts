// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import { PageMetaDto } from '../../../common/dtos/page-meta.dto';
import { PaginateDto } from '../../../common/dtos/paginate.dto';
import { SearchMomentDto } from '../dtos/search-moment.dto';
import { TIME_OF_DAY_HOURS, TimeOfDayEnum } from '../dtos/time-filter.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';

// Helpers
import { QuerySortingHelper } from '../../../common/helpers/query-sorting.helper';

// Interfaces
import type { IMomentFacets } from '../interfaces/moments.interface';

// NestJS Libraries
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// TypeORM
import { Repository, SelectQueryBuilder } from 'typeorm';

const SOFT_DELETE_FILTER = 'moments.deleted_at IS NULL';
const COL_CAPTURED_AT = 'moments.captured_at';

@Injectable()
export class MomentsService {
  constructor(
    @InjectRepository(MomentEntity)
    private readonly _momentsRepository: Repository<MomentEntity>,
  ) {}

  private _addRelations(_query: SelectQueryBuilder<MomentEntity>): void {
    // ? Add relations here (e.g., photographer join) when UsersModule is available
  }

  private _searchData(filters: SearchMomentDto, query: SelectQueryBuilder<MomentEntity>): void {
    // TODO Phase 2: if query is provided, call gRPC embedding service before searching
    query.andWhere(
      `(
        moments.caption ILIKE :searchQuery OR
        moments.description ILIKE :searchQuery OR
        moments.city ILIKE :searchQuery OR
        moments.district ILIKE :searchQuery
      )`,
      { searchQuery: `%${filters.query}%` },
    );
  }

  private _sortData(filters: SearchMomentDto, query: SelectQueryBuilder<MomentEntity>): void {
    const permitSort = {
      capturedAt: COL_CAPTURED_AT,
    };

    QuerySortingHelper(query, filters.sortBy ?? ['capturedAt|DESC'], permitSort);
  }

  private _applyTimeOfDayFilter(
    timeOfDay: TimeOfDayEnum,
    query: SelectQueryBuilder<MomentEntity>,
  ): void {
    const range = TIME_OF_DAY_HOURS[timeOfDay];

    if (timeOfDay === TimeOfDayEnum.NIGHT) {
      query.andWhere(
        `(
          EXTRACT(HOUR FROM TO_TIMESTAMP(${COL_CAPTURED_AT})) >= :nightStart OR
          EXTRACT(HOUR FROM TO_TIMESTAMP(${COL_CAPTURED_AT})) < :nightEnd
        )`,
        { nightEnd: 5, nightStart: 19 },
      );
    } else {
      query.andWhere(
        `EXTRACT(HOUR FROM TO_TIMESTAMP(${COL_CAPTURED_AT})) >= :todStart AND
         EXTRACT(HOUR FROM TO_TIMESTAMP(${COL_CAPTURED_AT})) < :todEnd`,
        { todEnd: range.end, todStart: range.start },
      );
    }
  }

  private async _filterData(
    filters: SearchMomentDto,
    query: SelectQueryBuilder<MomentEntity>,
  ): Promise<IResultFilter<MomentEntity>> {
    try {
      this._addRelations(query);

      query.andWhere(SOFT_DELETE_FILTER);

      if (filters.query) {
        this._searchData(filters, query);
      }

      if (filters.location?.city) {
        query.andWhere('moments.city ILIKE :city', {
          city: `%${filters.location.city}%`,
        });
      }

      if (filters.location?.district) {
        query.andWhere('moments.district ILIKE :district', {
          district: `%${filters.location.district}%`,
        });
      }

      if (filters.timeRange?.from) {
        query.andWhere(`${COL_CAPTURED_AT} >= :from`, { from: filters.timeRange.from });
      }

      if (filters.timeRange?.to) {
        query.andWhere(`${COL_CAPTURED_AT} <= :to`, { to: filters.timeRange.to });
      }

      if (filters.timeRange?.timeOfDay) {
        this._applyTimeOfDayFilter(filters.timeRange.timeOfDay, query);
      }

      if (filters.vehicleTypes?.length) {
        query.andWhere('moments.vehicle_type IN (:...vehicleTypes)', {
          vehicleTypes: filters.vehicleTypes,
        });
      }

      if (filters.licensePlate) {
        query.andWhere('moments.license_plate ILIKE :plate', {
          plate: `%${filters.licensePlate}%`,
        });
      }

      if (filters.sortBy?.length) {
        this._sortData(filters, query);
      } else {
        query.orderBy(COL_CAPTURED_AT, 'DESC');
      }

      query.take(filters.limit ?? 10);
      query.skip(filters.skip);

      const [data, totalData] = await query.cache(true).getManyAndCount();
      const total = data.length;

      return { data, total, totalData };
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { error?: string } };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  public async search(filters: SearchMomentDto): Promise<PaginateDto<MomentEntity>> {
    try {
      const query = this._momentsRepository.createQueryBuilder('moments');
      const { data, total, totalData } = await this._filterData(filters, query);
      const meta = new PageMetaDto({
        page: filters.offset ?? 1,
        size: filters.limit ?? 10,
        total,
        totalData,
      });

      return new PaginateDto<MomentEntity>(data, meta);
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { error?: string } };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  public async findOneById(id: string): Promise<MomentEntity> {
    const moment = await this._momentsRepository.findOne({
      where: { id, deletedAt: undefined },
    });

    if (!moment) {
      throw new NotFoundException(`Moment with id ${id} not found.`);
    }

    return moment;
  }

  public async findRecent(limit = 10): Promise<MomentEntity[]> {
    try {
      return await this._momentsRepository
        .createQueryBuilder('moments')
        .where(SOFT_DELETE_FILTER)
        .orderBy(COL_CAPTURED_AT, 'DESC')
        .take(limit)
        .cache(true)
        .getMany();
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { error?: string } };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  public async getFacets(): Promise<IMomentFacets> {
    try {
      const citiesRaw = await this._momentsRepository
        .createQueryBuilder('moments')
        .select('moments.city', 'label')
        .addSelect('COUNT(*)', 'count')
        .where(SOFT_DELETE_FILTER)
        .andWhere('moments.city IS NOT NULL')
        .groupBy('moments.city')
        .orderBy('count', 'DESC')
        .limit(20)
        .cache(true)
        .getRawMany<{ count: string; label: string }>();

      const vehicleTypesRaw = await this._momentsRepository
        .createQueryBuilder('moments')
        .select('moments.vehicle_type', 'label')
        .addSelect('COUNT(*)', 'count')
        .where(SOFT_DELETE_FILTER)
        .andWhere('moments.vehicle_type IS NOT NULL')
        .groupBy('moments.vehicle_type')
        .orderBy('count', 'DESC')
        .cache(true)
        .getRawMany<{ count: string; label: string }>();

      return {
        cities: citiesRaw.map((row) => ({
          count: Number(row.count),
          label: row.label,
        })),
        vehicleTypes: vehicleTypesRaw.map((row) => ({
          count: Number(row.count),
          label: row.label,
        })),
      };
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { error?: string } };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }
}
