// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { PhotographerProfileEntity } from './photographer-profile.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';

@Entity('photographer_reviews')
export class PhotographerReviewEntity extends AppBaseEntity {
  @ApiProperty({ description: 'FK to photographer_profiles.id' })
  @Column({ name: 'photographer_profile_id', type: 'uuid' })
  public photographerProfileId!: string;

  @ManyToOne(() => PhotographerProfileEntity, (profile) => profile.reviews, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'photographer_profile_id' })
  public photographerProfile?: Relation<PhotographerProfileEntity>;

  @ApiProperty({ nullable: true, description: 'FK to users.id when reviewer is a Captura user' })
  @Column({ name: 'reviewer_user_id', type: 'uuid', nullable: true })
  public reviewerUserId!: string | null;

  @ManyToOne(() => UsersEntity, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_user_id' })
  public reviewerUser?: Relation<UsersEntity> | null;

  @ApiProperty({ example: 'Adit R.' })
  @Column({ name: 'author_name', type: 'varchar', length: 120 })
  public authorName!: string;

  @ApiProperty({ nullable: true, example: 'Family archive · March 2026' })
  @Column({ name: 'context', type: 'varchar', length: 180, nullable: true })
  public context!: string | null;

  @ApiProperty({ example: 5 })
  @Column({ name: 'rating', type: 'smallint' })
  public rating!: number;

  @ApiProperty()
  @Column({ name: 'quote', type: 'text' })
  public quote!: string;

  @ApiProperty({ default: true })
  @Column({ name: 'is_published', type: 'boolean', default: true })
  public isPublished!: boolean;
}
