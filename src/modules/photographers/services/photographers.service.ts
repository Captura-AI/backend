// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import type { OnboardPhotographerDto } from '../dtos/onboard-photographer.dto';

// Entities
import { PhotographerProfileEntity } from '../entities/photographer-profile.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Services
import { UsersService } from '../../users/services/users.service';

// TypeORM
import { DataSource, EntityManager, Repository } from 'typeorm';

@Injectable()
export class PhotographersService {
  constructor(
    @InjectRepository(PhotographerProfileEntity)
    private readonly _photographerProfileRepository: Repository<PhotographerProfileEntity>,
    private readonly _dataSource: DataSource,
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
}
