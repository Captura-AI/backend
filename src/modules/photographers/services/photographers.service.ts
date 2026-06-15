// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import type { CreateMomentDto } from '../../moments/dtos/create-moment.dto';
import type { ListMyMomentsDto } from '../../moments/dtos/list-my-moments.dto';
import type { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';
import type { UpdateMomentDto } from '../../moments/dtos/update-moment.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';
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
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';

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
      return await this._dataSource.transaction(async (manager: EntityManager) => {
        const profile = new PhotographerProfileEntity();

        profile.artistName = dto.artistName;
        profile.bio = dto.bio ?? null;
        profile.isApproved = true;
        profile.joinedAsPhotographerAt = Math.floor(Date.now() / 1000);
        profile.location = dto.location ?? null;
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

    const slug = this._generateSlug(dto.caption);

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

  private _generateSlug(caption: string): string {
    const base = caption
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 200);
    return `${base || 'moment'}-${Date.now()}`;
  }
}
