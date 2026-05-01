// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { MomentCollaboratorEntity } from './moment-collaborator.entity';
import { MomentLicenseEntity } from './moment-license.entity';
import { PhotographerProfileEntity } from '../../photographers/entities/photographer-profile.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { VehicleTypeEnum } from '../enums/vehicle-type.enum';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('moments')
export class MomentEntity extends AppBaseEntity {
  // ─── Media ──────────────────────────────────────────────────────────────────

  @ApiProperty({ nullable: true })
  @Column({ name: 'image_url', type: 'text', nullable: true })
  public imageUrl!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  public thumbnailUrl!: string | null;

  // ─── Capture Info ────────────────────────────────────────────────────────────

  @ApiProperty({ nullable: true, description: 'Unix timestamp when the photo was taken' })
  @Column({ name: 'captured_at', type: 'bigint', nullable: true })
  public capturedAt!: number | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'caption', type: 'text', nullable: true })
  public caption!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'description', type: 'text', nullable: true })
  public description!: string | null;

  @ApiProperty({ nullable: true, description: 'Extended narrative about this moment' })
  @Column({ name: 'story', type: 'text', nullable: true })
  public story!: string | null;

  @ApiProperty({ nullable: true, description: 'URL-friendly identifier' })
  @Column({ name: 'slug', type: 'varchar', length: 255, nullable: true, unique: true })
  public slug!: string | null;

  @ApiProperty({ nullable: true, isArray: true, type: String, description: 'Keywords / tags' })
  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  public tags!: string[] | null;

  @ApiProperty({ nullable: true, description: 'Camera model and settings used' })
  @Column({ name: 'camera_info', type: 'varchar', length: 255, nullable: true })
  public cameraInfo!: string | null;

  // ─── Location ────────────────────────────────────────────────────────────────

  @ApiProperty({ nullable: true })
  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  public city!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'district', type: 'varchar', length: 100, nullable: true })
  public district!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  public latitude!: number | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  public longitude!: number | null;

  // ─── Photographer ────────────────────────────────────────────────────────────

  @ApiProperty({ nullable: true, description: 'FK to users.id' })
  @Column({ name: 'photographer_id', type: 'uuid', nullable: true })
  public photographerId!: string | null;

  @ManyToOne(() => UsersEntity, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'photographer_id' })
  public photographer?: UsersEntity | null;

  @ApiProperty({ nullable: true, description: 'FK to photographer_profiles.id' })
  @Column({ name: 'photographer_profile_id', type: 'uuid', nullable: true })
  public photographerProfileId!: string | null;

  @ManyToOne(() => PhotographerProfileEntity, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'photographer_profile_id' })
  public photographerProfile?: PhotographerProfileEntity | null;

  @OneToMany(() => MomentCollaboratorEntity, (c) => c.moment, { eager: false })
  public collaborators?: MomentCollaboratorEntity[];

  @OneToMany(() => MomentLicenseEntity, (license) => license.moment, { eager: false })
  public licenses?: MomentLicenseEntity[];

  // ─── Vehicle ─────────────────────────────────────────────────────────────────

  @ApiProperty({ enum: VehicleTypeEnum, nullable: true })
  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleTypeEnum, nullable: true })
  public vehicleType!: VehicleTypeEnum | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'license_plate', type: 'varchar', length: 20, nullable: true })
  public licensePlate!: string | null;

  // ─── Metadata & AI Placeholders ──────────────────────────────────────────────

  @ApiProperty({ nullable: true, description: 'Flexible JSONB storage for additional data' })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  public metadata!: Record<string, unknown> | null;

  @ApiProperty({ nullable: true, description: 'Placeholder for Phase 2 AI analysis results' })
  @Column({ name: 'ai_analysis', type: 'jsonb', nullable: true })
  public aiAnalysis!: Record<string, unknown> | null;

  // TODO Phase 2: migrate to pgvector column type for semantic search
  @ApiProperty({
    nullable: true,
    type: [Number],
    description: 'Placeholder for Phase 2 pgvector embedding',
  })
  @Column({ name: 'embedding', type: 'simple-json', nullable: true })
  public embedding!: number[] | null;

  @ApiProperty({
    nullable: true,
    type: [Number],
    description:
      'CLIP embedding vector (512-dim) stored in pgvector column for semantic similarity search',
  })
  @Column({
    name: 'embedding_vector',
    nullable: true,
    transformer: {
      from: (v: string | null): number[] | null => {
        if (!v) return null;
        return v
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map(Number);
      },
      to: (v: number[] | null): string | null => (v ? `[${v.join(',')}]` : null),
    },
    type: 'text',
  })
  public embeddingVector!: number[] | null;
}
