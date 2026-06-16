// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { MomentEntity } from '../../moments/entities/moments.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

/**
 * A moment a buyer bookmarked. Uniqueness is enforced per (user, moment); a
 * previously removed bookmark is restored rather than duplicated.
 */
@Entity('saved_moments')
@Unique('UQ_saved_moments_user_moment', ['userId', 'momentId'])
export class SavedMomentEntity extends AppBaseEntity {
  @ApiProperty({ description: 'FK to users.id (owner of the bookmark)' })
  @Column({ name: 'user_id', type: 'uuid' })
  public userId!: string;

  @ManyToOne(() => UsersEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user?: UsersEntity;

  @ApiProperty({ description: 'FK to moments.id' })
  @Column({ name: 'moment_id', type: 'uuid' })
  public momentId!: string;

  @ManyToOne(() => MomentEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'moment_id' })
  public moment?: MomentEntity;
}
