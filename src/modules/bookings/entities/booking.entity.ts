// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { PhotographerPackageEntity } from '../../photographers/entities/photographer-package.entity';
import { PhotographerProfileEntity } from '../../photographers/entities/photographer-profile.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { BookingStatusEnum } from '../enums/booking-status.enum';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';

@Entity('bookings')
export class BookingEntity extends AppBaseEntity {
  // ─── Relations ───────────────────────────────────────────────────────────────

  @ApiProperty({ description: 'FK to users.id — buyer who created this booking' })
  @Column({ name: 'user_id', type: 'uuid' })
  public userId!: string;

  @ManyToOne(() => UsersEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user?: Relation<UsersEntity>;

  @ApiProperty({ description: 'FK to photographer_profiles.id' })
  @Column({ name: 'photographer_profile_id', type: 'uuid' })
  public photographerProfileId!: string;

  @ManyToOne(() => PhotographerProfileEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'photographer_profile_id' })
  public photographerProfile?: Relation<PhotographerProfileEntity>;

  @ApiProperty({ nullable: true, description: 'FK to photographer_packages.id (optional)' })
  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  public packageId!: string | null;

  @ManyToOne(() => PhotographerPackageEntity, {
    eager: false,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'package_id' })
  public package?: Relation<PhotographerPackageEntity> | null;

  // ─── Status ──────────────────────────────────────────────────────────────────

  @ApiProperty({ enum: BookingStatusEnum, default: BookingStatusEnum.PENDING })
  @Column({ name: 'status', type: 'varchar', length: 20, default: BookingStatusEnum.PENDING })
  public status!: BookingStatusEnum;

  // ─── Session Details (proposed by buyer) ─────────────────────────────────────

  @ApiProperty({ description: 'Proposed session date — Unix timestamp (seconds)' })
  @Column({ name: 'proposed_date', type: 'bigint' })
  public proposedDate!: number;

  @ApiProperty({ nullable: true })
  @Column({ name: 'location', type: 'varchar', length: 200, nullable: true })
  public location!: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'message', type: 'text', nullable: true })
  public message!: string | null;

  // ─── Photographer Response ────────────────────────────────────────────────────

  @ApiProperty({ nullable: true })
  @Column({ name: 'response_message', type: 'text', nullable: true })
  public responseMessage!: string | null;

  @ApiProperty({ nullable: true, description: 'Counter-proposed date — Unix timestamp (seconds)' })
  @Column({ name: 'counter_proposed_date', type: 'bigint', nullable: true })
  public counterProposedDate!: number | null;

  // ─── Pricing ─────────────────────────────────────────────────────────────────

  @ApiProperty({ nullable: true, description: 'Agreed price after negotiation' })
  @Column({ name: 'agreed_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  public agreedPrice!: number | null;

  @ApiProperty({ default: 'IDR' })
  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'IDR' })
  public currency!: string;
}
