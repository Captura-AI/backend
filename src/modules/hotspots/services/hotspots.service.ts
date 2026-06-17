// Entities
import { HotspotEntity } from '../entities/hotspot.entity';
import { MomentEntity } from '../../moments/entities/moments.entity';

// Interfaces
import type {
  HotspotLevel,
  IPublicActivePhotographer,
  IPublicFeedMoment,
  IPublicHotspotDetail,
  IPublicHotspotPage,
  IPublicHotspotStats,
  IPublicHotspotSummary,
  IPublicRegionStats,
} from '../interfaces/public-hotspots.interface';

// NestJS Libraries
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// TypeORM
import { IsNull, Repository } from 'typeorm';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_DAY = 86_400;
const LAST15_WINDOW_SECONDS = 15 * SECONDS_PER_MINUTE;
const ACTIVE_WINDOW_SECONDS = 60 * SECONDS_PER_MINUTE;

const FEED_LIMIT = 6;
const DETAIL_FEED_LIMIT = 6;
const ACTIVE_PHOTOGRAPHERS_LIMIT = 8;

const HOT_ACTIVE_THRESHOLD = 2;
const HOT_LAST15_THRESHOLD = 5;

const DEFAULT_PHOTOGRAPHER_NAME = 'Captura photographer';
const MOMENTS_ALIAS = 'moments';
const SOFT_DELETE_FILTER = 'moments.deleted_at IS NULL';

/**
 * Region-level presentation metadata for the single region Captura currently
 * covers. The map center is an approximate Jawa Barat centroid and the golden
 * hour time is an approximate regional guidance value — not a live calculation.
 */
const REGION = {
  center: [-6.9, 107.5] as [number, number],
  code: 'ID',
  goldenHourTime: '17:42',
  name: 'Jawa Barat',
  primaryCity: 'Bandung',
} as const;

interface IRawStats {
  total: string | null;
  last15: string | null;
  active: string | null;
}

@Injectable()
export class HotspotsService {
  constructor(
    @InjectRepository(HotspotEntity)
    private readonly _hotspotRepository: Repository<HotspotEntity>,
    @InjectRepository(MomentEntity)
    private readonly _momentRepository: Repository<MomentEntity>,
  ) {}

  /**
   * @description Build the public hotspot map page: curated areas enriched with
   * live activity stats aggregated from real moments, plus a regional feed.
   */
  public async findHotspotPage(): Promise<IPublicHotspotPage> {
    const hotspots = await this._findActiveHotspots();

    const summaries = await Promise.all(
      hotspots.map(async (hotspot) => {
        const stats = await this._aggregateStats(hotspot.areaKeywords ?? []);

        return this._toSummary(hotspot, stats);
      }),
    );

    const regionKeywords = this._collectKeywords(hotspots);
    const recentMoments = await this._findRecentMoments(regionKeywords, FEED_LIMIT);
    const defaultHotspot = hotspots.find((hotspot) => hotspot.isDefault) ?? hotspots[0];

    return {
      activePhotographers: this._toActivePhotographers(recentMoments),
      center: REGION.center,
      defaultHotspotId: defaultHotspot?.slug ?? '',
      feedMoments: recentMoments.map((moment) => this._toFeedMoment(moment)),
      hotspots: summaries,
      region: REGION.name,
      regionCode: REGION.code,
      regionStats: await this._buildRegionStats(regionKeywords, summaries),
    };
  }

  /**
   * @description Public detail for a single curated hotspot, enriched with its
   * own live stats and the latest real moments captured in the area.
   */
  public async findHotspotDetailBySlug(slug: string): Promise<IPublicHotspotDetail> {
    const hotspot = await this._hotspotRepository.findOne({
      where: { deletedAt: IsNull(), isActive: true, slug },
    });

    if (!hotspot) {
      throw new NotFoundException(`Hotspot with slug ${slug} not found.`);
    }

    const keywords = hotspot.areaKeywords ?? [];
    const stats = await this._aggregateStats(keywords);
    const latestMoments = await this._findRecentMoments(keywords, DETAIL_FEED_LIMIT);

    return {
      activePhotographers: this._toActivePhotographers(latestMoments),
      bestTimeLabel: hotspot.bestTimeLabel,
      bestTimeWindow: hotspot.bestTimeWindow,
      description: hotspot.description,
      heroImageUrl: hotspot.heroImageUrl,
      id: hotspot.slug,
      latestMoments: latestMoments.map((moment) => this._toFeedMoment(moment)),
      level: this._deriveLevel(stats),
      meta: hotspot.meta,
      name: hotspot.name,
      popularTags: hotspot.popularTags ?? [],
      region: hotspot.region,
      slug: hotspot.slug,
      stats,
      title: hotspot.title,
    };
  }

  private async _findActiveHotspots(): Promise<HotspotEntity[]> {
    return await this._hotspotRepository.find({
      order: { displayOrder: 'ASC' },
      where: { deletedAt: IsNull(), isActive: true },
    });
  }

  private _collectKeywords(hotspots: HotspotEntity[]): string[] {
    const keywords = hotspots.flatMap((hotspot) => hotspot.areaKeywords ?? []);

    return Array.from(new Set(keywords));
  }

  /**
   * @description Aggregate total / last-15-minute / active-photographer counts
   * for an area from the real `moments` table. Returns zeros when the area has
   * no keywords or no matching moments — never fabricated numbers.
   */
  private async _aggregateStats(keywords: string[]): Promise<IPublicHotspotStats> {
    if (keywords.length === 0) {
      return { active: 0, last15: 0, total: 0 };
    }

    const now = this._nowInSeconds();
    const raw = await this._momentRepository
      .createQueryBuilder(MOMENTS_ALIAS)
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE moments.created_at >= :last15Since)`, 'last15')
      .addSelect(
        `COUNT(DISTINCT moments.photographer_id) FILTER (WHERE moments.created_at >= :activeSince)`,
        'active',
      )
      .where(SOFT_DELETE_FILTER)
      .andWhere(this._keywordMatchSql(), { keywords })
      .setParameters({
        activeSince: now - ACTIVE_WINDOW_SECONDS,
        last15Since: now - LAST15_WINDOW_SECONDS,
      })
      .getRawOne<IRawStats>();

    return {
      active: this._toCount(raw?.active),
      last15: this._toCount(raw?.last15),
      total: this._toCount(raw?.total),
    };
  }

  private async _findRecentMoments(keywords: string[], limit: number): Promise<MomentEntity[]> {
    if (keywords.length === 0) {
      return [];
    }

    return await this._momentRepository
      .createQueryBuilder(MOMENTS_ALIAS)
      .leftJoinAndSelect('moments.photographer', 'photographer')
      .where(SOFT_DELETE_FILTER)
      .andWhere('moments.image_url IS NOT NULL')
      .andWhere(this._keywordMatchSql(), { keywords })
      // Order by entity property paths (not raw SQL): TypeORM resolves orderBy
      // targets to column metadata when paginating (take), and a raw COALESCE
      // expression is not resolvable. NULLS LAST + createdAt fallback preserves
      // the original "captured_at, else created_at, newest first" intent.
      .orderBy('moments.capturedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('moments.createdAt', 'DESC', 'NULLS LAST')
      .take(limit)
      .getMany();
  }

  private async _buildRegionStats(
    keywords: string[],
    summaries: IPublicHotspotSummary[],
  ): Promise<IPublicRegionStats> {
    const busiest = [...summaries].sort((a, b) => b.last15 - a.last15)[0];
    const goldenHourLocation = busiest && busiest.last15 > 0 ? busiest.name : REGION.primaryCity;

    if (keywords.length === 0) {
      return {
        activePhotographers: 0,
        goldenHourLocation,
        goldenHourTime: REGION.goldenHourTime,
        momentsCapturedToday: 0,
      };
    }

    const startOfToday = this._startOfTodayInSeconds();
    const raw = await this._momentRepository
      .createQueryBuilder(MOMENTS_ALIAS)
      .select('COUNT(*)', 'momentsToday')
      .addSelect('COUNT(DISTINCT moments.photographer_id)', 'activePhotographers')
      .where(SOFT_DELETE_FILTER)
      .andWhere('moments.created_at >= :startOfToday', { startOfToday })
      .andWhere(this._keywordMatchSql(), { keywords })
      .getRawOne<{ momentsToday: string | null; activePhotographers: string | null }>();

    return {
      activePhotographers: this._toCount(raw?.activePhotographers),
      goldenHourLocation,
      goldenHourTime: REGION.goldenHourTime,
      momentsCapturedToday: this._toCount(raw?.momentsToday),
    };
  }

  private _keywordMatchSql(): string {
    return (
      '(LOWER(TRIM(moments.city)) IN (:...keywords) OR ' +
      'LOWER(TRIM(moments.district)) IN (:...keywords))'
    );
  }

  private _deriveLevel(stats: IPublicHotspotStats): HotspotLevel {
    if (stats.active >= HOT_ACTIVE_THRESHOLD || stats.last15 >= HOT_LAST15_THRESHOLD) {
      return 'hot';
    }

    if (stats.last15 > 0 || stats.total > 0) {
      return 'warm';
    }

    return 'quiet';
  }

  private _toSummary(hotspot: HotspotEntity, stats: IPublicHotspotStats): IPublicHotspotSummary {
    return {
      active: stats.active,
      count: stats.total,
      id: hotspot.slug,
      last15: stats.last15,
      latitude: Number(hotspot.latitude),
      level: this._deriveLevel(stats),
      longitude: Number(hotspot.longitude),
      meta: hotspot.meta,
      name: hotspot.name,
      slug: hotspot.slug,
      title: hotspot.title,
      total: stats.total,
    };
  }

  /**
   * @description Map a moment to a display-safe feed item. Deliberately omits
   * the license plate — public hotspot feeds never expose plate data.
   */
  private _toFeedMoment(moment: MomentEntity): IPublicFeedMoment {
    return {
      capturedAt: moment.capturedAt,
      caption: moment.caption ?? 'Untitled moment',
      createdAt: moment.createdAt,
      id: moment.id,
      imageUrl: moment.thumbnailUrl ?? moment.imageUrl,
      photographerName: moment.photographer?.name ?? DEFAULT_PHOTOGRAPHER_NAME,
      tags: moment.tags ?? [],
    };
  }

  private _toActivePhotographers(moments: MomentEntity[]): IPublicActivePhotographer[] {
    const byId = new Map<string, IPublicActivePhotographer>();

    for (const moment of moments) {
      const photographer = moment.photographer;

      if (!photographer || byId.has(photographer.id)) {
        continue;
      }

      byId.set(photographer.id, {
        avatarUrl: photographer.avatar,
        id: photographer.id,
        name: photographer.name ?? DEFAULT_PHOTOGRAPHER_NAME,
      });
    }

    return Array.from(byId.values()).slice(0, ACTIVE_PHOTOGRAPHERS_LIMIT);
  }

  private _toCount(value: string | null | undefined): number {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private _nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  private _startOfTodayInSeconds(): number {
    const now = this._nowInSeconds();

    return now - (now % SECONDS_PER_DAY);
  }
}
