// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { PhotographerProfileEntity } from './photographer-profile.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';

@Entity('photographer_packages')
export class PhotographerPackageEntity extends AppBaseEntity {
  @ApiProperty({ description: 'FK to photographer_profiles.id' })
  @Column({ name: 'photographer_profile_id', type: 'uuid' })
  public photographerProfileId!: string;

  @ManyToOne(() => PhotographerProfileEntity, (profile) => profile.packages, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'photographer_profile_id' })
  public photographerProfile?: Relation<PhotographerProfileEntity>;

  @ApiProperty({ example: 'Personal walk' })
  @Column({ name: 'name', type: 'varchar', length: 120 })
  public name!: string;

  @ApiProperty({ example: 450000 })
  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2 })
  public price!: number;

  @ApiProperty({ default: 'IDR', example: 'IDR' })
  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'IDR' })
  public currency!: string;

  @ApiProperty({ example: '60 minutes' })
  @Column({ name: 'duration', type: 'varchar', length: 80 })
  public duration!: string;

  @ApiProperty({ nullable: true })
  @Column({ name: 'description', type: 'text', nullable: true })
  public description!: string | null;

  @ApiProperty({ isArray: true, type: String })
  @Column({ name: 'includes', type: 'simple-array', nullable: true })
  public includes!: string[] | null;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  public isActive!: boolean;
}
