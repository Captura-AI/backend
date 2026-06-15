// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import { PageMetaDto } from '../../../common/dtos/page-meta.dto';
import { PaginateDto } from '../../../common/dtos/paginate.dto';
import { SearchMomentDto } from '../dtos/search-moment.dto';
import { TIME_OF_DAY_HOURS, TimeOfDayEnum } from '../dtos/time-filter.dto';

// Entities
import { MomentEntity } from '../entities/moments.entity';
import { MomentLicenseEntity } from '../entities/moment-license.entity';

// Helpers
import { QuerySortingHelper } from '../../../common/helpers/query-sorting.helper';

// Interfaces
import type {
  IMomentFacets,
  IMomentSearchMatch,
  IMomentSearchResult,
  IPhotographerSummary,
} from '../interfaces/moments.interface';

// NestJS Libraries
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// TypeORM
import { Repository, SelectQueryBuilder } from 'typeorm';

// Services
import { AiAnalysisService } from './ai-analysis.service';

const SOFT_DELETE_FILTER = 'moments.deleted_at IS NULL';
const COL_CAPTURED_AT = 'moments.captured_at';
const NORMALIZED_PLATE_SQL = `regexp_replace(upper(moments.license_plate), '[^A-Z0-9]', '', 'g')`;

function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function vectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

function maskPlate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized.length <= 4) {
    return `${normalized.slice(0, 1)}***`;
  }

  return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
}

function maskPublicMoment(moment: MomentEntity): MomentEntity {
  return Object.assign(Object.create(Object.getPrototypeOf(moment)) as MomentEntity, moment, {
    licensePlate: maskPlate(moment.licensePlate),
  });
}

function scoreTextMatch(moment: MomentEntity, query?: string): number {
  if (!query) {
    return 0;
  }

  const normalizedQuery = query.toLowerCase();
  const searchableValues = [
    moment.caption,
    moment.description,
    moment.city,
    moment.district,
    ...(moment.tags ?? []),
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());

  return searchableValues.some((value) => value.includes(normalizedQuery)) ? 0.68 : 0.42;
}

function scorePlateMatch(moment: MomentEntity, licensePlate?: string): number {
  if (!licensePlate || !moment.licensePlate) {
    return 0;
  }

  const queryPlate = normalizePlate(licensePlate);
  const momentPlate = normalizePlate(moment.licensePlate);

  if (!queryPlate || !momentPlate) {
    return 0;
  }

  if (momentPlate === queryPlate) {
    return 1;
  }

  return momentPlate.includes(queryPlate) || queryPlate.includes(momentPlate) ? 0.86 : 0;
}

function buildMatch(moment: MomentEntity, filters: SearchMomentDto): IMomentSearchMatch {
  const plateScore = scorePlateMatch(moment, filters.licensePlate);
  const textScore = scoreTextMatch(moment, filters.query);
  const semanticScore = filters.query && moment.embeddingVector ? 0.74 : 0;
  const score = Math.max(plateScore, semanticScore, textScore, 0.25);

  if (plateScore > 0) {
    return {
      isPlateMatch: true,
      isSemanticMatch: false,
      label: plateScore === 1 ? 'plate-exact' : 'plate-partial',
      score,
    };
  }

  if (semanticScore > 0) {
    return {
      isPlateMatch: false,
      isSemanticMatch: true,
      label: 'semantic',
      score,
    };
  }

  return {
    isPlateMatch: false,
    isSemanticMatch: false,
    label: textScore > 0 ? 'text' : 'recent',
    score,
  };
}

@Injectable()
export class MomentsService {
  constructor(
    @InjectRepository(MomentEntity)
    private readonly _momentsRepository: Repository<MomentEntity>,
    @InjectRepository(MomentLicenseEntity)
    private readonly _momentLicensesRepository: Repository<MomentLicenseEntity>,
    private readonly _aiAnalysisService: AiAnalysisService,
  ) {}

  private _addRelations(query: SelectQueryBuilder<MomentEntity>): void {
    query.leftJoinAndSelect('moments.photographer', 'photographer');
  }

  private _addDetailRelations(query: SelectQueryBuilder<MomentEntity>): void {
    query
      .leftJoinAndSelect('moments.photographer', 'photographer')
      .leftJoinAndSelect('moments.photographerProfile', 'photographerProfile')
      .leftJoinAndSelect('photographerProfile.user', 'photographerUser')
      .leftJoinAndSelect(
        'moments.licenses',
        'licenses',
        'licenses.is_active = true AND licenses.deleted_at IS NULL',
      );
  }

  private _searchData(filters: SearchMomentDto, query: SelectQueryBuilder<MomentEntity>): void {
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

  private _applyPlateFilter(licensePlate: string, query: SelectQueryBuilder<MomentEntity>): void {
    const normalizedPlate = normalizePlate(licensePlate);

    if (!normalizedPlate) {
      return;
    }

    query.andWhere(`${NORMALIZED_PLATE_SQL} LIKE :plate`, {
      plate: `%${normalizedPlate}%`,
    });
  }

  private async _getQueryEmbedding(filters: SearchMomentDto): Promise<number[] | null> {
    if (!filters.query) {
      return null;
    }

    return this._aiAnalysisService.embedTextQuery(filters.query);
  }

  private _applySemanticOrdering(
    embedding: number[],
    query: SelectQueryBuilder<MomentEntity>,
  ): void {
    query
      .addSelect('moments.embedding_vector <=> :queryEmbedding::vector', 'semantic_distance')
      .andWhere('moments.embedding_vector IS NOT NULL')
      .orderBy('semantic_distance', 'ASC')
      .setParameter('queryEmbedding', vectorLiteral(embedding));
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
      const queryEmbedding = await this._getQueryEmbedding(filters);

      this._addRelations(query);

      query.andWhere(SOFT_DELETE_FILTER);

      if (queryEmbedding) {
        this._applySemanticOrdering(queryEmbedding, query);
      }

      if (filters.query && !queryEmbedding) {
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
        this._applyPlateFilter(filters.licensePlate, query);
      }

      if (!queryEmbedding && filters.sortBy?.length) {
        this._sortData(filters, query);
      } else if (!queryEmbedding) {
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
      const maskedData = data.map(maskPublicMoment);
      const meta = new PageMetaDto({
        page: filters.offset ?? 1,
        size: filters.limit ?? 10,
        total,
        totalData,
      });

      return new PaginateDto<MomentEntity>(maskedData, meta);
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { error?: string } };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Fuzzy "find my vehicle's photos" search. Plates are matched
   * "close enough" via trigram similarity (real-world OCR is imperfect), with
   * motor type and color used to boost ranking. When no plate is given, falls
   * back to filtering by type/color alone.
   */
  public async findByVehicle(params: {
    plate?: string | null;
    motorType?: string | null;
    color?: string | null;
    threshold?: number;
    limit?: number;
  }): Promise<Array<MomentEntity & { matchScore: number }>> {
    const normalizedPlate = this._normalizePlate(params.plate);
    const motorType = params.motorType?.trim() ? params.motorType.trim() : null;
    const color = params.color?.trim() ? params.color.trim() : null;
    const threshold = params.threshold ?? 0.3;
    const limit = params.limit ?? 20;

    if (!normalizedPlate && !motorType && !color) {
      return [];
    }

    // Boost weights: an exact plate match scores 1.0; matching type/color adds
    // on top so the right vehicle floats up even when the plate is imperfect.
    const TYPE_BOOST = 0.3;
    const COLOR_BOOST = 0.2;
    // Normalized plate expression — must mirror the trigram index in the
    // AddPlateSearchSupportToMoments migration so the index is usable.
    const plateExpr = `regexp_replace(upper(coalesce(moments.license_plate, '')), '[^A-Z0-9]', '', 'g')`;

    try {
      const query = this._momentsRepository.createQueryBuilder('moments');
      this._addRelations(query);
      query.where(SOFT_DELETE_FILTER);
      query.setParameters({ color, motorType });

      if (normalizedPlate) {
        query.setParameter('plate', normalizedPlate);
        query.andWhere(`similarity(${plateExpr}, :plate) >= :threshold`, { threshold });
        query.addSelect(
          `similarity(${plateExpr}, :plate)
            + CASE WHEN :motorType::text IS NOT NULL AND upper(moments.motor_type) = upper(:motorType::text) THEN ${TYPE_BOOST} ELSE 0 END
            + CASE WHEN :color::text IS NOT NULL AND upper(moments.color) = upper(:color::text) THEN ${COLOR_BOOST} ELSE 0 END`,
          'match_score',
        );
        query.orderBy('match_score', 'DESC');
      } else {
        // No readable plate — fall back to type/color filtering.
        if (motorType) {
          query.andWhere('upper(moments.motor_type) = upper(:motorType::text)');
        }
        if (color) {
          query.andWhere('upper(moments.color) = upper(:color::text)');
        }
        query.addSelect('0', 'match_score');
        query.orderBy(COL_CAPTURED_AT, 'DESC');
      }

      query.limit(limit);

      const { entities, raw } = await query.getRawAndEntities();

      return entities.map((entity, index) =>
        Object.assign(entity, {
          matchScore: Number((raw[index] as { match_score?: number })?.match_score ?? 0),
        }),
      );
    } catch (error: unknown) {
      const err = error as { message?: string; response?: { error?: string } };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  private _normalizePlate(plate?: string | null): string | null {
    if (!plate) {
      return null;
    }
    const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normalized.length > 0 ? normalized : null;
  }
  public async searchWithMatches(
    filters: SearchMomentDto,
  ): Promise<PaginateDto<IMomentSearchResult>> {
    const query = this._momentsRepository.createQueryBuilder('moments');
    const { data, total, totalData } = await this._filterData(filters, query);
    const meta = new PageMetaDto({
      page: filters.offset ?? 1,
      size: filters.limit ?? 10,
      total,
      totalData,
    });
    const content = data.map((moment) => ({
      match: buildMatch(moment, filters),
      moment: maskPublicMoment(moment),
    }));

    return new PaginateDto<IMomentSearchResult>(content, meta);
  }

  public async findOneById(
    id: string,
  ): Promise<MomentEntity & { photographerSummary: IPhotographerSummary | null }> {
    const query = this._momentsRepository.createQueryBuilder('moments');

    this._addDetailRelations(query);
    query.where('moments.id = :id', { id }).andWhere(SOFT_DELETE_FILTER);

    const moment = await query.getOne();

    if (!moment) {
      throw new NotFoundException(`Moment with id ${id} not found.`);
    }

    let photographerSummary: IPhotographerSummary | null = null;

    if (moment.photographerProfile) {
      const totalMoments = await this._momentsRepository.count({
        where: {
          photographerProfileId: moment.photographerProfileId ?? undefined,
          deletedAt: undefined,
        },
      });

      photographerSummary = {
        id: moment.photographerProfile.id,
        artistName: moment.photographerProfile.artistName,
        bio: moment.photographerProfile.bio,
        location: moment.photographerProfile.location,
        avatar: moment.photographerProfile.user?.avatar ?? null,
        totalMoments,
      };
    }

    return Object.assign(maskPublicMoment(moment), { photographerSummary });
  }

  public async findSimilar(momentId: string, limit = 10): Promise<MomentEntity[]> {
    const source = await this._momentsRepository.findOne({
      where: { id: momentId, deletedAt: undefined },
      select: ['id', 'city', 'embeddingVector', 'vehicleType'],
    });

    if (!source) {
      throw new NotFoundException(`Moment with id ${momentId} not found.`);
    }

    const query = this._momentsRepository
      .createQueryBuilder('moments')
      .where(SOFT_DELETE_FILTER)
      .andWhere('moments.id != :momentId', { momentId });

    this._addRelations(query);

    if (source.embeddingVector?.length === 512) {
      const similarMoments = await query
        .addSelect('moments.embedding_vector <=> :sourceEmbedding::vector', 'semantic_distance')
        .andWhere('moments.embedding_vector IS NOT NULL')
        .orderBy('semantic_distance', 'ASC')
        .setParameter('sourceEmbedding', vectorLiteral(source.embeddingVector))
        .take(limit)
        .getMany();

      return similarMoments.map(maskPublicMoment);
    }

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (source.city) {
      conditions.push('moments.city = :city');
      params['city'] = source.city;
    }

    if (source.vehicleType) {
      conditions.push('moments.vehicle_type = :vehicleType');
      params['vehicleType'] = source.vehicleType;
    }

    if (conditions.length > 0) {
      query.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    const similarMoments = await query.orderBy(COL_CAPTURED_AT, 'DESC').take(limit).getMany();

    return similarMoments.map(maskPublicMoment);
  }

  public async findLicensesByMomentId(momentId: string): Promise<MomentLicenseEntity[]> {
    const momentExists = await this._momentsRepository.exists({
      where: { id: momentId, deletedAt: undefined },
    });

    if (!momentExists) {
      throw new NotFoundException(`Moment with id ${momentId} not found.`);
    }

    return this._momentLicensesRepository.find({
      where: { momentId, isActive: true, deletedAt: undefined },
      order: { price: 'ASC' },
    });
  }

  public async findRecent(limit = 10): Promise<MomentEntity[]> {
    try {
      const moments = await this._momentsRepository
        .createQueryBuilder('moments')
        .where(SOFT_DELETE_FILTER)
        .orderBy(COL_CAPTURED_AT, 'DESC')
        .take(limit)
        .cache(true)
        .getMany();

      return moments.map(maskPublicMoment);
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
