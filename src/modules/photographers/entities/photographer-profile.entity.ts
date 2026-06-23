// Entities
import { PhotographerPackageEntity } from './photographer-package.entity';
import { PhotographerReviewEntity } from './photographer-review.entity';
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { PhotographerApprovalStatusEnum } from '../enums/photographer-approval-status.enum';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';

@Entity('photographer_profiles')
export class PhotographerProfileEntity extends AppBaseEntity {
  @ApiProperty({ description: 'FK to users.id' })
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  public userId!: string;

  @OneToOne(() => UsersEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  public user?: UsersEntity;

  @ApiProperty()
  @Column({ name: 'artist_name', type: 'varchar', length: 100 })
  public artistName!: string;

  @ApiProperty({ description: 'URL-friendly public identifier' })
  @Column({ name: 'slug', type: 'varchar', length: 140, nullable: true, unique: true })
  public slug!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'bio', type: 'text', nullable: true })
  public bio!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'location', type: 'varchar', length: 100, nullable: true })
  public location!: string | null;

  @ApiProperty({ description: 'Unix timestamp when user became a photographer' })
  @Column({ name: 'joined_as_photographer_at', type: 'bigint' })
  public joinedAsPhotographerAt!: number;

  @ApiProperty({ default: false })
  @Column({ name: 'is_approved', type: 'boolean', default: false })
  public isApproved!: boolean;

  @ApiProperty({
    enum: PhotographerApprovalStatusEnum,
    default: PhotographerApprovalStatusEnum.PENDING,
  })
  @Column({
    name: 'approval_status',
    type: 'varchar',
    length: 20,
    default: PhotographerApprovalStatusEnum.PENDING,
  })
  public approvalStatus!: PhotographerApprovalStatusEnum;

  @OneToMany(() => PhotographerPackageEntity, (item) => item.photographerProfile, {
    eager: false,
  })
  public packages?: PhotographerPackageEntity[];

  @OneToMany(() => PhotographerReviewEntity, (item) => item.photographerProfile, {
    eager: false,
  })
  public reviews?: PhotographerReviewEntity[];
}
