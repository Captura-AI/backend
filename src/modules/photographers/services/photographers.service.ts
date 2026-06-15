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
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';
import { PhotographerReviewEntity } from '../entities/photographer-review.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Services
import { PlateService } from '../../plate/services/plate.service';
import { AiAnalysisService } from '../../moments/services/ai-analysis.service';
import { UsersService } from '../../users/services/users.service';

// TypeORM
import { DataSource, EntityManager, ILike, IsNull, Repository } from 'typeorm';

export interface IMyMomentsResult {
  data: MomentEntity[];
  limit: number;
  offset: number;
  total: number;
}

@Injectable()
export class PhotographersService {
  constructor(
    @InjectRepository(MomentEntity)
    private readonly _momentRepository: Repository<MomentEntity>,
    @InjectRepository(PhotographerProfileEntity)
    private readonly _photographerProfileRepository: Repository<PhotographerProfileEntity>,
    private readonly _aiAnalysisService: AiAnalysisService,
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
        profile.bio = dto.bio ?? null;
        profile.isApproved = true;
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
      deletedAt: IsNull(),
      isApproved: true,
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
      where: { deletedAt: IsNull(), isApproved: true, slug },
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

    // Auto-tag the moment with AI-detected plate / motor type / color so it
    // becomes searchable. Run outside the DB transaction (network I/O) and stay
    // fault-tolerant — the upload must still succeed if the AI service is down.
    const aiAttributes = imageFile ? await this._extractVehicleAttributes(imageFile) : null;

    try {
      return await this._dataSource.transaction(async (manager: EntityManager) => {
        const moment = new MomentEntity();

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
        moment.vehicleType = dto.vehicleType ?? null;

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
   * @description Trigger AI analysis for a moment — fire-and-forget, does not block the response
   */
  public triggerAiAnalysis(momentId: string, imageUrl: string | null): void {
    if (!imageUrl) return;
    void this._aiAnalysisService.analyzeMoment(momentId, imageUrl);
  }

  /**
   * @description List paginated moments owned by the authenticated photographer
   */
  public async findMyMoments(userId: string, dto: ListMyMomentsDto): Promise<IMyMomentsResult> {
    const limit = dto.limit ?? 10;
    const offset = dto.offset ?? 1;

    const [data, total] = await this._momentRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: dto.skip,
      take: limit,
      where: { deletedAt: IsNull(), photographerId: userId },
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
        if (dto.vehicleType !== undefined) moment.vehicleType = dto.vehicleType ?? null;

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
   * @description Read plate / motor type / color from the uploaded image via the
   * AI service. Never throws — returns nulls if extraction fails so uploads are
   * resilient to the AI service being unavailable.
   */
  private async _extractVehicleAttributes(
    imageFile: Express.Multer.File,
  ): Promise<{ plate: string | null; motorType: string | null; color: string | null }> {
    try {
      const extracted = await this._plateService.extract(imageFile);
      const dominantMotor = extracted.motors[0] ?? null;

      return {
        color: dominantMotor?.color ?? null,
        motorType: dominantMotor?.motorType ?? null,
        plate: extracted.plates[0] ?? null,
      };
    } catch {
      return { color: null, motorType: null, plate: null };
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
