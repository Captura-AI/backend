// DTOs
import type { CreateSavedSearchDto } from '../dtos/create-saved-search.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import type { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { SavedMomentEntity } from '../entities/saved-moment.entity';
import { SavedSearchEntity } from '../entities/saved-search.entity';

// Interfaces
import type {
  IExplorerFilter,
  IPublicSavedMoment,
  IPublicSavedSearch,
} from '../interfaces/public-saved.interface';

// NestJS Libraries
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// TypeORM
import { IsNull, Repository } from 'typeorm';

const USD_CURRENCY = 'USD';
const DEFAULT_PHOTOGRAPHER_NAME = 'Captura photographer';

@Injectable()
export class SavedService {
  constructor(
    @InjectRepository(SavedMomentEntity)
    private readonly _savedMomentRepository: Repository<SavedMomentEntity>,
    @InjectRepository(SavedSearchEntity)
    private readonly _savedSearchRepository: Repository<SavedSearchEntity>,
    @InjectRepository(MomentEntity)
    private readonly _momentRepository: Repository<MomentEntity>,
  ) {}

  public async listSavedMoments(userId: string): Promise<IPublicSavedMoment[]> {
    const saved = await this._savedMomentRepository.find({
      order: { createdAt: 'DESC' },
      relations: {
        moment: { licenses: true, photographer: true, photographerProfile: true },
      },
      where: { deletedAt: IsNull(), userId },
    });

    return saved
      .filter((item) => item.moment?.deletedAt === null)
      .map((item) => this._toPublicSavedMoment(item));
  }

  /**
   * @description Bookmark a moment for the user. Idempotent: an existing active
   * bookmark is returned as-is and a previously removed one is restored, so a
   * user can never accumulate duplicates.
   */
  public async saveMoment(userId: string, momentId: string): Promise<SavedMomentEntity> {
    const moment = await this._momentRepository.findOne({
      where: { deletedAt: IsNull(), id: momentId },
    });

    if (!moment) {
      throw new NotFoundException(`Moment with id ${momentId} not found.`);
    }

    const existing = await this._savedMomentRepository.findOne({ where: { momentId, userId } });

    if (existing?.deletedAt === null) {
      return existing;
    }

    if (existing) {
      existing.deletedAt = null;

      return await this._savedMomentRepository.save(existing);
    }

    const saved = new SavedMomentEntity();

    saved.momentId = momentId;
    saved.userId = userId;

    return await this._savedMomentRepository.save(saved);
  }

  public async removeSavedMoment(userId: string, momentId: string): Promise<void> {
    const existing = await this._savedMomentRepository.findOne({
      where: { deletedAt: IsNull(), momentId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Saved moment not found.');
    }

    await this._savedMomentRepository.update(
      { id: existing.id },
      { deletedAt: Math.floor(Date.now() / 1000) },
    );
  }

  public async listSavedSearches(userId: string): Promise<IPublicSavedSearch[]> {
    const searches = await this._savedSearchRepository.find({
      order: { createdAt: 'DESC' },
      where: { deletedAt: IsNull(), userId },
    });

    return searches.map((search) => this._toPublicSavedSearch(search));
  }

  public async createSavedSearch(
    userId: string,
    dto: CreateSavedSearchDto,
  ): Promise<IPublicSavedSearch> {
    const search = new SavedSearchEntity();

    search.filters = this._normalizeFilters(dto.filters);
    search.label = dto.label;
    search.query = dto.query ?? null;
    search.resultCount = dto.resultCount ?? 0;
    search.summary = dto.summary ?? null;
    search.userId = userId;

    const saved = await this._savedSearchRepository.save(search);

    return this._toPublicSavedSearch(saved);
  }

  public async removeSavedSearch(userId: string, id: string): Promise<void> {
    const existing = await this._savedSearchRepository.findOne({
      where: { deletedAt: IsNull(), id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Saved search not found.');
    }

    await this._savedSearchRepository.update(
      { id: existing.id },
      { deletedAt: Math.floor(Date.now() / 1000) },
    );
  }

  private _normalizeFilters(filters?: IExplorerFilter[]): IExplorerFilter[] {
    if (!filters?.length) {
      return [];
    }

    return filters.map((filter) => ({
      key: filter.key,
      keyLabel: filter.keyLabel,
      value: filter.value,
    }));
  }

  private _lowestUsdPrice(licenses?: MomentLicenseEntity[]): number | null {
    const prices = (licenses ?? [])
      .filter(
        (license) =>
          license.isActive && license.deletedAt === null && license.currency === USD_CURRENCY,
      )
      .map((license) => Number(license.price))
      .filter((price) => Number.isFinite(price));

    if (prices.length === 0) {
      return null;
    }

    return Math.min(...prices);
  }

  private _toPublicSavedMoment(saved: SavedMomentEntity): IPublicSavedMoment {
    const moment = saved.moment as MomentEntity;
    const photographerName =
      moment.photographerProfile?.artistName ??
      moment.photographer?.name ??
      DEFAULT_PHOTOGRAPHER_NAME;

    return {
      capturedAt: moment.capturedAt,
      city: moment.city,
      id: saved.id,
      imageUrl: moment.thumbnailUrl ?? moment.imageUrl,
      momentId: moment.id,
      momentSlug: moment.slug,
      photographerName,
      priceUsd: this._lowestUsdPrice(moment.licenses),
      savedAt: saved.createdAt,
      title: moment.caption ?? 'Untitled moment',
    };
  }

  private _toPublicSavedSearch(search: SavedSearchEntity): IPublicSavedSearch {
    return {
      createdAt: search.createdAt,
      filters: search.filters ?? [],
      id: search.id,
      label: search.label,
      query: search.query,
      resultCount: search.resultCount,
      summary: search.summary,
    };
  }
}
