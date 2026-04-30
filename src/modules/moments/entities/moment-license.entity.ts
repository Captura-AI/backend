// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { LicenseTypeEntity } from '../../license-types/entities/license-type.entity';
import { MomentEntity } from './moments.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';

@Entity('moment_licenses')
export class MomentLicenseEntity extends AppBaseEntity {
  // ─── Moment Relation ─────────────────────────────────────────────────────────

  @ApiProperty({ description: 'FK to moments.id' })
  @Column({ name: 'moment_id', type: 'uuid' })
  public momentId!: string;

  @ManyToOne(() => MomentEntity, (moment) => moment.licenses, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'moment_id' })
  public moment?: Relation<MomentEntity>;

  // ─── License Type Relation ───────────────────────────────────────────────────

  @ApiProperty({ nullable: true, description: 'FK to license_types.id' })
  @Column({ name: 'license_type_id', type: 'uuid', nullable: true })
  public licenseTypeId!: string | null;

  @ManyToOne(() => LicenseTypeEntity, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'license_type_id' })
  public licenseType?: Relation<LicenseTypeEntity> | null;

  // ─── Pricing ─────────────────────────────────────────────────────────────────

  @ApiProperty({ example: 29.99, description: 'Photographer-set price for this license type' })
  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  public price!: number;

  @ApiProperty({ default: 'USD', example: 'USD' })
  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'USD' })
  public currency!: string;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  public isActive!: boolean;
}
