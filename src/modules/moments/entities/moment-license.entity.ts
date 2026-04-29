// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
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

  // ─── License Info ─────────────────────────────────────────────────────────────

  @ApiProperty({ example: 'Editorial' })
  @Column({ name: 'name', type: 'varchar', length: 100 })
  public name!: string;

  @ApiProperty({ nullable: true, example: 'For non-commercial editorial use only' })
  @Column({ name: 'description', type: 'text', nullable: true })
  public description!: string | null;

  @ApiProperty({ example: 29.99 })
  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  public price!: number;

  @ApiProperty({ default: 'USD', example: 'USD' })
  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'USD' })
  public currency!: string;

  @ApiProperty({ nullable: true, example: 'Unlimited prints, no resale' })
  @Column({ name: 'usage_rights', type: 'text', nullable: true })
  public usageRights!: string | null;

  @ApiProperty({ default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  public isActive!: boolean;
}
