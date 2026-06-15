// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { MomentEntity } from '../../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { OrderEntity } from './order.entity';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';

@Entity('order_items')
export class OrderItemEntity extends AppBaseEntity {
  // ─── Relations ───────────────────────────────────────────────────────────────

  @ApiProperty({ description: 'FK to orders.id' })
  @Column({ name: 'order_id', type: 'uuid' })
  public orderId!: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'order_id' })
  public order?: Relation<OrderEntity>;

  @ApiProperty({ nullable: true, description: 'FK to moments.id' })
  @Column({ name: 'moment_id', type: 'uuid', nullable: true })
  public momentId!: string | null;

  @ManyToOne(() => MomentEntity, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'moment_id' })
  public moment?: Relation<MomentEntity> | null;

  @ApiProperty({ nullable: true, description: 'FK to moment_licenses.id' })
  @Column({ name: 'license_id', type: 'uuid', nullable: true })
  public licenseId!: string | null;

  @ManyToOne(() => MomentLicenseEntity, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'license_id' })
  public license?: Relation<MomentLicenseEntity> | null;

  // ─── Pricing ─────────────────────────────────────────────────────────────────

  @ApiProperty({ default: 1 })
  @Column({ name: 'quantity', type: 'int', default: 1 })
  public quantity!: number;

  @ApiProperty({ example: 500000 })
  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public unitPrice!: number;

  @ApiProperty({ example: 500000 })
  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public totalPrice!: number;

  @ApiProperty({ default: 'IDR', example: 'IDR' })
  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'IDR' })
  public currency!: string;
}
