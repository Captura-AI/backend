// Entities
import { AppBaseEntity } from '../../../common/entities/base.entity';
import { MomentEntity } from '../../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { OrderItemEntity } from './order-item.entity';
import { UsersEntity } from '../../users/entities/users.entity';

// Enums
import { OrderStatusEnum } from '../enums/order-status.enum';
import { PaymentGatewayEnum } from '../enums/payment-gateway.enum';
import { PaymentMethodEnum } from '../enums/payment-method.enum';

// Interfaces
import type { IBillingInfo } from '../interfaces/orders.interface';

// NestJS Libraries
import { ApiProperty } from '@nestjs/swagger';

// TypeORM
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, type Relation } from 'typeorm';

@Entity('orders')
export class OrderEntity extends AppBaseEntity {
  // ─── Relations ───────────────────────────────────────────────────────────────

  @ApiProperty({ nullable: true, description: 'FK to users.id' })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  public userId!: string | null;

  @ManyToOne(() => UsersEntity, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'user_id' })
  public user?: Relation<UsersEntity> | null;

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

  @OneToMany(() => OrderItemEntity, (item) => item.order, { eager: false })
  public items?: Relation<OrderItemEntity>[];

  // ─── Status ───────────────────────────────────────────────────────────────────

  @ApiProperty({ enum: OrderStatusEnum, default: OrderStatusEnum.PENDING })
  @Column({ name: 'status', type: 'varchar', length: 20, default: OrderStatusEnum.PENDING })
  public status!: OrderStatusEnum;

  // ─── Pricing ─────────────────────────────────────────────────────────────────

  @ApiProperty({ example: 500000, description: 'Price before fees and taxes' })
  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public subtotalAmount!: number;

  @ApiProperty({ example: 25000, description: '5% platform service fee' })
  @Column({ name: 'service_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public serviceFee!: number;

  @ApiProperty({ example: 57750, description: '11% PPN tax' })
  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public taxAmount!: number;

  @ApiProperty({ example: 0, description: 'Discount from promo code' })
  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public discountAmount!: number;

  @ApiProperty({ example: 582750, description: 'Final amount to pay' })
  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  public totalAmount!: number;

  @ApiProperty({ default: 'IDR', example: 'IDR' })
  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'IDR' })
  public currency!: string;

  // ─── Payment ─────────────────────────────────────────────────────────────────

  @ApiProperty({ enum: PaymentMethodEnum, nullable: true })
  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  public paymentMethod!: PaymentMethodEnum | null;

  @ApiProperty({ enum: PaymentGatewayEnum, nullable: true })
  @Column({ name: 'payment_gateway', type: 'varchar', length: 20, nullable: true })
  public paymentGateway!: PaymentGatewayEnum | null;

  @ApiProperty({ nullable: true, description: 'Midtrans Snap token for frontend popup' })
  @Column({ name: 'payment_token', type: 'varchar', length: 500, nullable: true })
  public paymentToken!: string | null;

  @ApiProperty({ nullable: true, description: 'VA number or QR code URL' })
  @Column({ name: 'payment_reference', type: 'varchar', length: 500, nullable: true })
  public paymentReference!: string | null;

  @ApiProperty({ nullable: true, description: 'Unix timestamp when payment expires' })
  @Column({ name: 'payment_expired_at', type: 'bigint', nullable: true })
  public paymentExpiredAt!: number | null;

  // ─── Post-Payment ─────────────────────────────────────────────────────────────

  @ApiProperty({ nullable: true, description: 'Random token for accessing download after payment' })
  @Column({ name: 'download_token', type: 'varchar', length: 500, nullable: true })
  public downloadToken!: string | null;

  @ApiProperty({ nullable: true, description: 'Billing contact information (JSONB)' })
  @Column({ name: 'billing_info', type: 'jsonb', nullable: true })
  public billingInfo!: IBillingInfo | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'promo_code', type: 'varchar', length: 100, nullable: true })
  public promoCode!: string | null;

  @ApiProperty({ nullable: true, description: 'Unix timestamp when payment was confirmed' })
  @Column({ name: 'paid_at', type: 'bigint', nullable: true })
  public paidAt!: number | null;

  @ApiProperty({ nullable: true, description: 'Unix timestamp when order was cancelled' })
  @Column({ name: 'cancelled_at', type: 'bigint', nullable: true })
  public cancelledAt!: number | null;
}
