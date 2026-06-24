// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import type { CreateMomentDto } from '../../moments/dtos/create-moment.dto';
import type { ListMyMomentsDto } from '../../moments/dtos/list-my-moments.dto';
import type { ListPhotographersDto } from '../dtos/list-photographers.dto';
import type { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';
import type { PhotographerPackageEntity } from '../entities/photographer-package.entity';
import type { UpdateMomentDto } from '../../moments/dtos/update-moment.dto';
import type {
  IPublicPhotographerDetail,
  IPublicPhotographerDirectoryItem,
  IPublicPhotographerMoment,
} from '../interfaces/public-photographers.interface';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { OrderEntity } from '../../orders/entities/order.entity';
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';
import { PhotographerReviewEntity } from '../entities/photographer-review.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { OrderStatusEnum } from '../../orders/enums/order-status.enum';
import { PhotographerApprovalStatusEnum } from '../enums/photographer-approval-status.enum';
import { UserRoleEnum } from '../../users/enums/user-role.enum';
import { VehicleTypeEnum } from '../../moments/enums/vehicle-type.enum';

// NestJS Libraries
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Queue
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  AI_ANALYSIS_JOB,
  AI_ANALYSIS_JOB_OPTIONS,
  AI_ANALYSIS_QUEUE,
  IAiAnalysisJob,
} from '../../moments/queues/ai-analysis.queue';

// Services
import { PlateService } from '../../plate/services/plate.service';
import { UsersService } from '../../users/services/users.service';

// TypeORM
import {
  Between,
  DataSource,
  EntityManager,
  FindOperator,
  ILike,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

// Node
import { randomUUID } from 'crypto';

export interface IMyMomentsResult {
  data: MomentEntity[];
  limit: number;
  offset: number;
  total: number;
}

const PHOTOGRAPHER_REVENUE_SHARE = 0.7;

@Injectable()
export class PhotographersService {
  private readonly _logger = new Logger(PhotographersService.name);

  constructor(
    @InjectRepository(MomentEntity)
    private readonly _momentRepository: Repository<MomentEntity>,
    @InjectRepository(OrderEntity)
    private readonly _orderRepository: Repository<OrderEntity>,
    @InjectRepository(PhotographerProfileEntity)
    private readonly _photographerProfileRepository: Repository<PhotographerProfileEntity>,
    @InjectQueue(AI_ANALYSIS_QUEUE)
    private readonly _aiAnalysisQueue: Queue<IAiAnalysisJob>,
    private readonly _dataSource: DataSource,
    private readonly _plateService: PlateService,
    private readonly _usersService: UsersService,
  ) {}

  /**
   * @description Onboard a user as a photographer (creates profile + updates role in a transaction)
   */
  public async onboard(
    userId: string,
    dto: OnboardPhotographerDto,
  ): Promise<PhotographerProfileEntity> {
    const existing = await this._photographerProfileRepository.findOne({ where: { userId } });

    if (existing) {
      throw new ConflictException('User is already registered as a photographer.');
    }

    await this._usersService.findOneById(userId);

    try {
      const slug = await this._generateProfileSlug(dto.artistName);

      return await this._dataSource.transaction(async (manager: EntityManager) => {
        const profile = new PhotographerProfileEntity();

        profile.artistName = dto.artistName;
        profile.approvalStatus = PhotographerApprovalStatusEnum.PENDING;
        profile.bio = dto.bio ?? null;
        profile.isApproved = false;
        profile.joinedAsPhotographerAt = Math.floor(Date.now() / 1000);
        profile.location = dto.location ?? null;
        profile.slug = slug;
        profile.userId = userId;

        const savedProfile = await manager.save(PhotographerProfileEntity, profile);

        await manager.update(UsersEntity, { id: userId }, { role: UserRoleEnum.PHOTOGRAPHER });

        return savedProfile;
      });
    } catch (error: unknown) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Get a public photographer profile by profile ID (includes user relation)
   */
  public async findById(id: string): Promise<PhotographerProfileEntity> {
    const profile = await this._photographerProfileRepository.findOne({
      relations: { user: true },
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Photographer profile with id ${id} not found.`);
    }

    return profile;
  }

  public async findPublicDirectory(dto: ListPhotographersDto): Promise<{
    data: IPublicPhotographerDirectoryItem[];
    limit: number;
    offset: number;
    total: number;
  }> {
    const limit = dto.limit ?? 12;
    const offset = dto.offset ?? 1;
    const where = {
      approvalStatus: PhotographerApprovalStatusEnum.APPROVED,
      deletedAt: IsNull(),
      ...(dto.location ? { location: ILike(`%${dto.location}%`) } : {}),
    };

    const [profiles, total] = await this._photographerProfileRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { packages: true, reviews: true, user: true },
      skip: dto.skip,
      take: limit,
      where,
    });

    const momentsByProfileId = await this._findLatestMomentsByProfileIds(
      profiles.map((profile) => profile.id),
      3,
    );
    const data = profiles.map((profile) =>
      this._toDirectoryItem(profile, momentsByProfileId.get(profile.id) ?? []),
    );

    return { data, limit, offset, total };
  }

  public async findPublicDetailBySlug(slug: string): Promise<IPublicPhotographerDetail> {
    const profile = await this._photographerProfileRepository.findOne({
      relations: { packages: true, reviews: true, user: true },
      where: { approvalStatus: PhotographerApprovalStatusEnum.APPROVED, deletedAt: IsNull(), slug },
    });

    if (!profile) {
      throw new NotFoundException(`Photographer profile with slug ${slug} not found.`);
    }

    const portfolio = await this._momentRepository.find({
      order: { capturedAt: 'DESC', createdAt: 'DESC' },
      take: 12,
      where: { deletedAt: IsNull(), photographerProfileId: profile.id },
    });
    const latestMoments = portfolio.slice(0, 3);
    const directoryItem = this._toDirectoryItem(profile, latestMoments);

    return {
      ...directoryItem,
      portfolio: portfolio.map((moment) => this._toPublicMoment(moment)),
      reviews: this._publishedReviews(profile).map((review) => ({
        authorName: review.authorName,
        context: review.context,
        id: review.id,
        quote: review.quote,
        rating: review.rating,
      })),
    };
  }

  /**
   * @description Find a photographer profile by user ID (returns null if not a photographer)
   */
  public async findByUserId(userId: string): Promise<PhotographerProfileEntity | null> {
    return await this._photographerProfileRepository.findOne({ where: { userId } });
  }

  /**
   * @description Upload a new moment as the authenticated photographer
   */
  public async createMoment(
    userId: string,
    dto: CreateMomentDto,
    imageFile?: Express.Multer.File,
  ): Promise<MomentEntity> {
    const profile = await this.findByUserId(userId);

    if (!profile) {
      throw new ForbiddenException('User is not a registered photographer.');
    }

    const slug = this._generateMomentSlug(dto.caption);

    // Pre-generate the id so it doubles as the AI scan's uploader_id, keeping the
    // persisted plate_results keyed to this exact moment.
    const momentId = randomUUID();
    const autoApprove = dto.autoApprove ?? true;

    // Auto-tag via the stateful /plate/scan pipeline (persists plate_results +
    // saves an annotated image), mirroring the plate/scan flow. autoApprove keeps
    // the scan artifacts; otherwise they are discarded. Runs outside the DB
    // transaction (network I/O) and stays fault-tolerant — the upload must still
    // succeed if the AI service is down.
    const aiAttributes = imageFile
      ? await this._scanVehicleAttributes(momentId, imageFile, autoApprove)
      : null;

    try {
      return await this._dataSource.transaction(async (manager: EntityManager) => {
        const moment = new MomentEntity();

        moment.id = momentId;
        moment.cameraInfo = dto.cameraInfo ?? null;
        moment.caption = dto.caption;
        moment.capturedAt = dto.capturedAt ?? null;
        moment.city = dto.city ?? null;
        moment.color = aiAttributes?.color ?? null;
        moment.district = dto.district ?? null;
        moment.imageUrl = imageFile?.path ?? null;
        moment.latitude = dto.latitude ?? null;
        // Prefer a plate the photographer typed; otherwise use the AI reading.
        moment.licensePlate = dto.licensePlate ?? aiAttributes?.plate ?? null;
        moment.longitude = dto.longitude ?? null;
        moment.motorType = aiAttributes?.motorType ?? null;
        moment.photographerId = userId;
        moment.photographerProfileId = profile.id;
        moment.slug = slug;
        moment.story = dto.story ?? null;
        moment.tags = dto.tags ?? null;
        moment.vehicleType = this._normalizeVehicleType(dto.vehicleType);
        // Keep a reference to the kept annotated scan image (null when discarded).
        moment.metadata = aiAttributes
          ? {
              plateScan: { annotatedPhoto: aiAttributes.annotatedPhoto, autoApproved: autoApprove },
            }
          : null;

        const savedMoment = await manager.save(MomentEntity, moment);

        if (dto.licenses?.length) {
          const licenses = dto.licenses.map((licenseDto) => {
            const license = new MomentLicenseEntity();

            license.currency = licenseDto.currency ?? 'USD';
            license.isActive = licenseDto.isActive ?? true;
            license.licenseTypeId = licenseDto.licenseTypeId;
            license.momentId = savedMoment.id;
            license.price = licenseDto.price;

            return license;
          });

          await manager.save(MomentLicenseEntity, licenses);
        }

        return savedMoment;
      });
    } catch (error: unknown) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }

      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Enqueue AI analysis for a moment. Returns immediately — the
   * Redis-backed queue throttles processing so bulk uploads can't overload the
   * model service. Enqueue failures are logged, never blocking the upload.
   */
  public triggerAiAnalysis(momentId: string, imageUrl: string | null): void {
    if (!imageUrl) return;
    void this._aiAnalysisQueue
      .add(AI_ANALYSIS_JOB, { imageUrl, momentId }, AI_ANALYSIS_JOB_OPTIONS)
      .catch((err: unknown) => {
        this._logger.warn(`Failed to enqueue AI analysis for moment ${momentId}: ${err}`);
      });
  }

  /**
   * @description Reset all AI-derived fields and re-trigger the full analysis pipeline.
   *
   * Clears aiAnalysis, embeddingVector, and the scalar fields auto-filled from the
   * first run (licensePlate, vehicleType, motorType, color, capturedAt, cameraInfo,
   * latitude, longitude). buildAutoFillFields() only fills empty fields, so resetting
   * them here lets the new run write fresh values. Manually-entered fields
   * (caption, story, tags) are preserved.
   */
  public async retryMomentAnalysis(userId: string, momentId: string): Promise<void> {
    const moment = await this._momentRepository.findOne({
      where: { id: momentId, photographerId: userId, deletedAt: IsNull() },
    });

    if (!moment) {
      throw new NotFoundException('Moment not found');
    }

    await this._momentRepository.update(moment.id, {
      aiAnalysis: null,
      cameraInfo: null,
      capturedAt: null,
      color: null,
      embeddingVector: null,
      latitude: null,
      licensePlate: null,
      longitude: null,
      motorType: null,
      vehicleType: null,
    });

    this.triggerAiAnalysis(moment.id, moment.imageUrl);
  }

  /**
   * @description Build a TypeORM operator that filters a date column by range (Unix seconds).
   * Returns undefined when no range bounds are provided (no filter applied).
   */
  private _buildDateRangeFilter(
    startDate?: number,
    endDate?: number,
  ): FindOperator<number> | undefined {
    if (startDate !== undefined && endDate !== undefined) return Between(startDate, endDate);
    if (startDate !== undefined) return MoreThanOrEqual(startDate);
    if (endDate !== undefined) return LessThanOrEqual(endDate);

    return undefined;
  }

  /**
   * @description List paginated moments owned by the authenticated photographer.
   * Supports optional date range via startDate / endDate (Unix seconds UTC).
   * Matches on capturedAt first; moments with capturedAt = null fall back to createdAt.
   */
  public async findMyMoments(userId: string, dto: ListMyMomentsDto): Promise<IMyMomentsResult> {
    const limit = dto.limit ?? 10;
    const offset = dto.offset ?? 1;
    const dateFilter = this._buildDateRangeFilter(dto.startDate, dto.endDate);

    const baseCondition = { deletedAt: IsNull(), photographerId: userId };

    const where = dateFilter
      ? [
          { ...baseCondition, capturedAt: dateFilter },
          { ...baseCondition, capturedAt: IsNull(), createdAt: dateFilter },
        ]
      : baseCondition;

    const [data, total] = await this._momentRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: dto.skip,
      take: limit,
      where,
    });

    return { data, limit, offset, total };
  }

  /**
   * @description Get a single moment owned by the authenticated photographer (includes licenses)
   */
  public async findMyMomentById(userId: string, momentId: string): Promise<MomentEntity> {
    const moment = await this._momentRepository.findOne({
      relations: { licenses: { licenseType: true } },
      where: { deletedAt: IsNull(), id: momentId, photographerId: userId },
    });

    if (!moment) {
      throw new NotFoundException(`Moment with id ${momentId} not found.`);
    }

    return moment;
  }

  /**
   * @description Update a moment owned by the authenticated photographer
   */
  public async updateMyMoment(
    userId: string,
    momentId: string,
    dto: UpdateMomentDto,
  ): Promise<MomentEntity> {
    const moment = await this.findMyMomentById(userId, momentId);

    try {
      return await this._dataSource.transaction(async (manager: EntityManager) => {
        if (dto.caption !== undefined) moment.caption = dto.caption;
        if (dto.cameraInfo !== undefined) moment.cameraInfo = dto.cameraInfo ?? null;
        if (dto.capturedAt !== undefined) moment.capturedAt = dto.capturedAt ?? null;
        if (dto.city !== undefined) moment.city = dto.city ?? null;
        if (dto.district !== undefined) moment.district = dto.district ?? null;
        if (dto.latitude !== undefined) moment.latitude = dto.latitude ?? null;
        if (dto.licensePlate !== undefined) moment.licensePlate = dto.licensePlate ?? null;
        if (dto.longitude !== undefined) moment.longitude = dto.longitude ?? null;
        if (dto.story !== undefined) moment.story = dto.story ?? null;
        if (dto.tags !== undefined) moment.tags = dto.tags ?? null;
        if (dto.vehicleType !== undefined)
          moment.vehicleType = this._normalizeVehicleType(dto.vehicleType);

        if (dto.isPublished !== undefined) moment.isPublished = dto.isPublished;

        const updatedMoment = await manager.save(MomentEntity, moment);

        if (dto.licenses !== undefined) {
          await manager.delete(MomentLicenseEntity, { momentId });

          if (dto.licenses.length > 0) {
            const licenses = dto.licenses.map((licenseDto) => {
              const license = new MomentLicenseEntity();

              license.currency = licenseDto.currency ?? 'USD';
              license.isActive = licenseDto.isActive ?? true;
              license.licenseTypeId = licenseDto.licenseTypeId;
              license.momentId = momentId;
              license.price = licenseDto.price;

              return license;
            });

            await manager.save(MomentLicenseEntity, licenses);
          }
        }

        return updatedMoment;
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  /**
   * @description Soft-delete a moment owned by the authenticated photographer
   */
  public async deleteMyMoment(userId: string, momentId: string): Promise<void> {
    await this.findMyMomentById(userId, momentId);

    await this._momentRepository.update(
      { id: momentId },
      { deletedAt: Math.floor(Date.now() / 1000) },
    );
  }

  /**
   * @description Bulk-set isPublished on moments owned by the authenticated photographer.
   * Only moments that exist and belong to the photographer are updated; unknown IDs are silently skipped.
   */
  public async bulkSetPublished(
    userId: string,
    momentIds: string[],
    isPublished: boolean,
  ): Promise<{ updated: number }> {
    if (momentIds.length === 0) {
      return { updated: 0 };
    }

    const result = await this._momentRepository.update(
      { id: In(momentIds), photographerId: userId, deletedAt: IsNull() },
      { isPublished },
    );

    const updated = result.affected ?? 0;

    return { updated };
  }

  /**
   * @description Approve a photographer profile (admin only)
   */
  public async approve(profileId: string): Promise<PhotographerProfileEntity> {
    const profile = await this.findById(profileId);

    profile.approvalStatus = PhotographerApprovalStatusEnum.APPROVED;
    profile.isApproved = true;

    return this._photographerProfileRepository.save(profile);
  }

  /**
   * @description Reject a photographer profile (admin only)
   */
  public async reject(profileId: string): Promise<PhotographerProfileEntity> {
    const profile = await this.findById(profileId);

    profile.approvalStatus = PhotographerApprovalStatusEnum.REJECTED;
    profile.isApproved = false;

    return this._photographerProfileRepository.save(profile);
  }

  /**
   * @description Earnings summary for the authenticated photographer
   */
  public async getEarningsSummary(userId: string): Promise<{
    currency: string;
    orderCount: number;
    photographerShare: number;
    platformFee: number;
    totalRevenue: number;
  }> {
    const profile = await this._photographerProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException('Photographer profile not found.');
    }

    const result = await this._orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.moment', 'moment')
      .where('moment.photographer_profile_id = :profileId', { profileId: profile.id })
      .andWhere('order.status = :status', { status: OrderStatusEnum.PAID })
      .select('COUNT(order.id)', 'orderCount')
      .addSelect('COALESCE(SUM(CAST(order.subtotal_amount AS numeric)), 0)', 'totalRevenue')
      .getRawOne<{ orderCount: string; totalRevenue: string }>();

    const totalRevenue = Number(result?.totalRevenue ?? 0);
    const orderCount = Number(result?.orderCount ?? 0);

    return {
      currency: 'IDR',
      orderCount,
      photographerShare: Math.round(totalRevenue * PHOTOGRAPHER_REVENUE_SHARE),
      platformFee: Math.round(totalRevenue * (1 - PHOTOGRAPHER_REVENUE_SHARE)),
      totalRevenue,
    };
  }

  /**
   * @description Paginated earnings history for the authenticated photographer
   */
  public async getEarningsHistory(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ data: OrderEntity[]; limit: number; offset: number; total: number }> {
    const profile = await this._photographerProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException('Photographer profile not found.');
    }

    const skip = (offset - 1) * limit;

    const [data, total] = await this._orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.moment', 'moment')
      .where('moment.photographer_profile_id = :profileId', { profileId: profile.id })
      .andWhere('order.status = :status', { status: OrderStatusEnum.PAID })
      .orderBy('order.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, limit, offset, total };
  }

  /**
   * @description Read plate / motor type / color from the uploaded image via the
   * AI service. Never throws — returns nulls if extraction fails so uploads are
   * resilient to the AI service being unavailable.
   */
  /**
   * Map a free-form vehicle type string onto the enum the column stores. The
   * upload accepts any string, but the DB column is constrained, so an unknown
   * value falls back to OTHER (and blank/missing -> null) instead of erroring.
   */
  private _normalizeVehicleType(value?: string | null): VehicleTypeEnum | null {
    if (!value?.trim()) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    const match = Object.values(VehicleTypeEnum).find((type) => type === normalized);
    return match ?? VehicleTypeEnum.OTHER;
  }

  /**
   * Run the stateful /plate/scan pipeline for an uploaded moment image and
   * return the dominant plate / motor type / color. When `autoApprove` is false
   * the scan's persisted artifacts (annotated image + plate_results) are
   * discarded, but the readings are still returned so the moment can be tagged.
   * Fully fault-tolerant: any AI failure yields null attributes.
   */
  private async _scanVehicleAttributes(
    uploaderId: string,
    imageFile: Express.Multer.File,
    autoApprove: boolean,
  ): Promise<{
    plate: string | null;
    motorType: string | null;
    color: string | null;
    annotatedPhoto: string | null;
  }> {
    try {
      const scan = await this._plateService.scan(uploaderId, imageFile);
      const dominantMotor = scan.motors[0] ?? null;

      if (!autoApprove) {
        await this._plateService.confirm({
          uploaderId,
          action: 'discard',
          savedPhotoFilename: scan.savedPhoto ?? undefined,
          savedResultPhotoFilename: scan.savedResultPhoto ?? undefined,
        });
      }

      return {
        color: dominantMotor?.color ?? null,
        motorType: dominantMotor?.motorType ?? null,
        plate: scan.plates[0] ?? null,
        annotatedPhoto: autoApprove ? (scan.savedResultPhoto ?? null) : null,
      };
    } catch {
      return { color: null, motorType: null, plate: null, annotatedPhoto: null };
    }
  }

  private async _findLatestMomentsByProfileIds(
    profileIds: string[],
    perProfileLimit: number,
  ): Promise<Map<string, MomentEntity[]>> {
    if (profileIds.length === 0) {
      return new Map<string, MomentEntity[]>();
    }

    const moments = await this._momentRepository.find({
      order: { capturedAt: 'DESC', createdAt: 'DESC' },
      where: profileIds.map((profileId) => ({
        deletedAt: IsNull(),
        photographerProfileId: profileId,
      })),
    });

    return moments.reduce((grouped, moment) => {
      const profileId = moment.photographerProfileId;

      if (!profileId) {
        return grouped;
      }

      const current = grouped.get(profileId) ?? [];

      if (current.length < perProfileLimit) {
        grouped.set(profileId, [...current, moment]);
      }

      return grouped;
    }, new Map<string, MomentEntity[]>());
  }

  private _activePackages(profile: PhotographerProfileEntity): PhotographerPackageEntity[] {
    return (profile.packages ?? []).filter((item) => item.isActive && item.deletedAt === null);
  }

  private _averageRating(reviews: PhotographerReviewEntity[]): number | null {
    if (reviews.length === 0) {
      return null;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);

    return Math.round((total / reviews.length) * 10) / 10;
  }

  private _generateMomentSlug(caption: string): string {
    const base = caption
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 200);
    return `${base || 'moment'}-${Date.now()}`;
  }

  private async _generateProfileSlug(artistName: string): Promise<string> {
    const base = this._slugify(artistName).substring(0, 120) || 'photographer';
    let candidate = base;
    let suffix = 2;

    while (await this._photographerProfileRepository.findOne({ where: { slug: candidate } })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private _maskPlate(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    if (normalized.length <= 4) {
      return `${normalized.slice(0, 1)}***`;
    }

    return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
  }

  private _publishedReviews(profile: PhotographerProfileEntity): PhotographerReviewEntity[] {
    return (profile.reviews ?? []).filter((item) => item.isPublished && item.deletedAt === null);
  }

  private _slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private _toDirectoryItem(
    profile: PhotographerProfileEntity,
    latestMoments: MomentEntity[],
  ): IPublicPhotographerDirectoryItem {
    const packages = this._activePackages(profile);
    const reviews = this._publishedReviews(profile);

    return {
      avatarUrl: profile.user?.avatar ?? null,
      bio: profile.bio,
      id: profile.id,
      isApproved: profile.isApproved,
      latestMoments: latestMoments.map((moment) => this._toPublicMoment(moment)),
      location: profile.location,
      name: profile.artistName,
      packages: packages.map((item) => ({
        currency: item.currency,
        description: item.description,
        duration: item.duration,
        id: item.id,
        includes: item.includes ?? [],
        name: item.name,
        price: Number(item.price),
      })),
      slug: profile.slug,
      stats: {
        averageRating: this._averageRating(reviews),
        momentsCount: latestMoments.length,
        packagesCount: packages.length,
        reviewsCount: reviews.length,
      },
    };
  }

  private _toPublicMoment(moment: MomentEntity): IPublicPhotographerMoment {
    const tags = moment.tags ?? [];
    const category = moment.vehicleType ?? tags[0] ?? 'Street';

    return {
      capturedAt: moment.capturedAt,
      category,
      city: moment.city,
      district: moment.district,
      id: moment.id,
      imageUrl: moment.thumbnailUrl ?? moment.imageUrl,
      licensePlate: this._maskPlate(moment.licensePlate),
      slug: moment.slug,
      tags,
      title: moment.caption ?? 'Untitled moment',
      vehicleType: moment.vehicleType,
    };
  }
}
