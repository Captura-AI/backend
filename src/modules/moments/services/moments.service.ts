// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';
import {
  MOMENTS_PUBLISHED_FILTER,
  MOMENTS_SOFT_DELETE_FILTER,
} from '../constants/moments.constant';

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
import {
  CANONICAL_PLATE_SQL,
  CANONICAL_PLATE_TRIGRAM_THRESHOLD,
  MAX_PLATE_LEVENSHTEIN_DISTANCE,
  NORMALIZED_PLATE_SQL,
  PLATE_FUZZY_CANONICAL_EXACT_SCORE,
  PLATE_FUZZY_DISTANCE_SCORE,
  PLATE_FUZZY_SIMILARITY_SCORE,
  PLATE_PARTIAL_SCORE,
  PLATE_TRIGRAM_THRESHOLD,
  canonicalizePlate,
  isFuzzyPlateEnabled,
  normalizePlate,
  vectorLiteral,
} from '../helpers/plate-matching.helper';
import { maskPublicMoment } from '../helpers/public-sanitization.helper';
import { buildMatch } from '../helpers/search-scoring.helper';

// Interfaces
import type {
  IMomentFacets,
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

// Raw SQL column reference — safe inside andWhere/EXTRACT expressions.
const COL_CAPTURED_AT = 'moments.captured_at';
// Entity property path for orderBy. TypeORM resolves orderBy targets to column
// metadata when paginating (skip/take), so it must be the camelCase property,
// not the snake_case DB column — otherwise getMany throws on `databaseName`.
const ORDER_CAPTURED_AT = 'moments.capturedAt';

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

    const canonicalPlate = canonicalizePlate(normalizedPlate);
    const isFuzzyEnabled = isFuzzyPlateEnabled(normalizedPlate);
    const exactOrPartialSql = `(
      ${NORMALIZED_PLATE_SQL} = :plate OR
      ${NORMALIZED_PLATE_SQL} LIKE :platePattern OR
      :plate LIKE '%' || ${NORMALIZED_PLATE_SQL} || '%'
    )`;

    if (!isFuzzyEnabled) {
      query
        .andWhere(exactOrPartialSql, {
          plate: normalizedPlate,
          platePattern: `%${normalizedPlate}%`,
        })
        .addSelect(
          `CASE
            WHEN ${NORMALIZED_PLATE_SQL} = :plate THEN 1
            WHEN ${NORMALIZED_PLATE_SQL} LIKE :platePattern OR :plate LIKE '%' || ${NORMALIZED_PLATE_SQL} || '%' THEN ${PLATE_PARTIAL_SCORE}
            ELSE 0
          END`,
          'plate_match_score',
        );

      return;
    }

    query
      .andWhere(
        `(
          ${exactOrPartialSql} OR
          ${CANONICAL_PLATE_SQL} = :canonicalPlate OR
          levenshtein_less_equal(${NORMALIZED_PLATE_SQL}, :plate, :maxPlateDistance) <= :maxPlateDistance OR
          levenshtein_less_equal(${CANONICAL_PLATE_SQL}, :canonicalPlate, :maxPlateDistance) <= :maxPlateDistance OR
          similarity(${NORMALIZED_PLATE_SQL}, :plate) >= :plateTrigramThreshold OR
          similarity(${CANONICAL_PLATE_SQL}, :canonicalPlate) >= :canonicalPlateTrigramThreshold
        )`,
        {
          canonicalPlate,
          canonicalPlateTrigramThreshold: CANONICAL_PLATE_TRIGRAM_THRESHOLD,
          maxPlateDistance: MAX_PLATE_LEVENSHTEIN_DISTANCE,
          plate: normalizedPlate,
          platePattern: `%${normalizedPlate}%`,
          plateTrigramThreshold: PLATE_TRIGRAM_THRESHOLD,
        },
      )
      .addSelect(
        `CASE
          WHEN ${NORMALIZED_PLATE_SQL} = :plate THEN 1
          WHEN ${NORMALIZED_PLATE_SQL} LIKE :platePattern OR :plate LIKE '%' || ${NORMALIZED_PLATE_SQL} || '%' THEN ${PLATE_PARTIAL_SCORE}
          WHEN ${CANONICAL_PLATE_SQL} = :canonicalPlate THEN ${PLATE_FUZZY_CANONICAL_EXACT_SCORE}
          WHEN levenshtein_less_equal(${NORMALIZED_PLATE_SQL}, :plate, :maxPlateDistance) <= :maxPlateDistance THEN ${PLATE_FUZZY_DISTANCE_SCORE}
          WHEN levenshtein_less_equal(${CANONICAL_PLATE_SQL}, :canonicalPlate, :maxPlateDistance) <= :maxPlateDistance THEN ${PLATE_FUZZY_DISTANCE_SCORE}
          ELSE ${PLATE_FUZZY_SIMILARITY_SCORE}
        END`,
        'plate_match_score',
      );
  }

  private _applyPlateOrdering(
    query: SelectQueryBuilder<MomentEntity>,
    hasQueryEmbedding: boolean,
  ): void {
    query.orderBy('plate_match_score', 'DESC');

    if (hasQueryEmbedding) {
      query.addOrderBy('semantic_distance', 'ASC');
    }

    query.addOrderBy(ORDER_CAPTURED_AT, 'DESC');
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
      capturedAt: ORDER_CAPTURED_AT,
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

      query.andWhere(MOMENTS_SOFT_DELETE_FILTER).andWhere(MOMENTS_PUBLISHED_FILTER);

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

      if (filters.licensePlate) {
        this._applyPlateOrdering(query, Boolean(queryEmbedding));
      } else if (!queryEmbedding && filters.sortBy?.length) {
        this._sortData(filters, query);
      } else if (!queryEmbedding) {
        query.orderBy(ORDER_CAPTURED_AT, 'DESC');
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
      query.where(MOMENTS_SOFT_DELETE_FILTER).andWhere(MOMENTS_PUBLISHED_FILTER);
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
        Object.assign(maskPublicMoment(entity), {
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
    const normalized = normalizePlate(plate);
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
    query
      .where('moments.id = :id', { id })
      .andWhere(MOMENTS_SOFT_DELETE_FILTER)
      .andWhere(MOMENTS_PUBLISHED_FILTER);

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
      .where(MOMENTS_SOFT_DELETE_FILTER)
      .andWhere(MOMENTS_PUBLISHED_FILTER)
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
        .where(MOMENTS_SOFT_DELETE_FILTER)
        .andWhere(MOMENTS_PUBLISHED_FILTER)
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
        .where(MOMENTS_SOFT_DELETE_FILTER)
        .andWhere(MOMENTS_PUBLISHED_FILTER)
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
        .where(MOMENTS_SOFT_DELETE_FILTER)
        .andWhere(MOMENTS_PUBLISHED_FILTER)
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
