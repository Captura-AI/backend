// Crypto
import { randomUUID } from 'crypto';

// Constants
import { BAD_REQUEST_MSG } from '../../../common/constants/common.constant';

// DTOs
import type { CheckoutRequestDto } from '../dtos/checkout-request.dto';
import type { ListOrdersDto } from '../dtos/list-orders.dto';

// Emails
import type { IOrderReceiptData } from '../emails/order-receipt.template';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';

// Enums
import { OrderStatusEnum } from '../enums/order-status.enum';
import { PaymentGatewayEnum } from '../enums/payment-gateway.enum';

// Interfaces
import type {
  IBillingInfo,
  ICheckoutResult,
  IDownloadResult,
  IMidtransWebhookPayload,
  IOrdersResult,
} from '../interfaces/orders.interface';

// NestJS Libraries
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// Services
import { AppConfigurationsService } from '../../../configurations/app/app-configuration.service';
import { MidtransService } from './midtrans.service';
import { OrderReceiptMailService } from './order-receipt-mail.service';

// TypeORM
import { IsNull, Repository, type FindOptionsWhere } from 'typeorm';

@Injectable()
export class OrdersService {
  private readonly _logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly _orderRepository: Repository<OrderEntity>,

    @InjectRepository(OrderItemEntity)
    private readonly _orderItemRepository: Repository<OrderItemEntity>,

    @InjectRepository(MomentEntity)
    private readonly _momentRepository: Repository<MomentEntity>,

    @InjectRepository(MomentLicenseEntity)
    private readonly _momentLicenseRepository: Repository<MomentLicenseEntity>,

    private readonly _midtransService: MidtransService,
    private readonly _config: AppConfigurationsService,
    private readonly _receiptMailService: OrderReceiptMailService,
  ) {}

  public async checkout(userId: string, dto: CheckoutRequestDto): Promise<ICheckoutResult> {
    const moment = await this._momentRepository.findOne({
      where: { deletedAt: IsNull(), id: dto.momentId },
    });

    if (!moment) {
      throw new NotFoundException(`Moment with id ${dto.momentId} not found.`);
    }

    const license = await this._momentLicenseRepository.findOne({
      where: { deletedAt: IsNull(), id: dto.licenseId, isActive: true, momentId: dto.momentId },
    });

    if (!license) {
      throw new NotFoundException(
        `License with id ${dto.licenseId} not found or not available for this moment.`,
      );
    }

    if (license.currency !== 'IDR') {
      throw new BadRequestException(
        'Only IDR-denominated licenses can be purchased. The selected license is priced in a different currency.',
      );
    }

    const billingInfo: IBillingInfo = {
      country: dto.billingInfo.country,
      email: dto.billingInfo.email,
      firstName: dto.billingInfo.firstName,
      lastName: dto.billingInfo.lastName,
      phone: dto.billingInfo.phone,
    };

    const subtotal = +license.price;
    const serviceFee = Math.floor(subtotal * this._config.serviceFeeRate);
    const taxAmount = Math.floor((subtotal + serviceFee) * this._config.taxRate);
    const discountAmount = 0;
    const totalAmount = subtotal + serviceFee + taxAmount - discountAmount;

    let savedOrderId: string | undefined;

    try {
      const order = new OrderEntity();
      order.billingInfo = billingInfo;
      order.currency = license.currency;
      order.discountAmount = discountAmount;
      order.licenseId = license.id;
      order.momentId = moment.id;
      order.paymentGateway = null;
      order.paymentMethod = dto.paymentMethod;
      order.promoCode = dto.promoCode ?? null;
      order.serviceFee = serviceFee;
      order.status = OrderStatusEnum.PENDING;
      order.subtotalAmount = subtotal;
      order.taxAmount = taxAmount;
      order.totalAmount = totalAmount;
      order.userId = userId;

      const savedOrder = await this._orderRepository.save(order);
      savedOrderId = savedOrder.id;

      const orderItem = new OrderItemEntity();
      orderItem.currency = license.currency;
      orderItem.licenseId = license.id;
      orderItem.momentId = moment.id;
      orderItem.orderId = savedOrder.id;
      orderItem.quantity = 1;
      orderItem.totalPrice = subtotal;
      orderItem.unitPrice = subtotal;

      await this._orderItemRepository.save(orderItem);

      const { redirect_url: redirectUrl, token } =
        await this._midtransService.createSnapTransaction(savedOrder);
      const paymentExpiredAt =
        Math.floor(Date.now() / 1000) + this._config.paymentExpiryMinutes * 60;

      await this._orderRepository.update(savedOrder.id, {
        paymentExpiredAt,
        paymentGateway: PaymentGatewayEnum.MIDTRANS,
        paymentToken: token,
      });

      savedOrder.paymentExpiredAt = paymentExpiredAt;
      savedOrder.paymentGateway = PaymentGatewayEnum.MIDTRANS;
      savedOrder.paymentToken = token;

      return { order: savedOrder, paymentExpiredAt, redirectUrl, snapToken: token };
    } catch (error: unknown) {
      // If the order was persisted before Midtrans failed, mark it FAILED so it doesn't
      // appear as a ghost PENDING order in the user's history.
      if (savedOrderId) {
        try {
          await this._orderRepository.update(savedOrderId, { status: OrderStatusEnum.FAILED });
        } catch (cleanupErr) {
          this._logger.warn(
            `Failed to mark order ${savedOrderId} as FAILED after Midtrans error: ${cleanupErr}`,
          );
        }
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  public async findMyOrders(userId: string, dto: ListOrdersDto): Promise<IOrdersResult> {
    const limit = dto.limit ?? 10;
    const offset = dto.offset ?? 1;

    const where: FindOptionsWhere<OrderEntity> = { deletedAt: IsNull(), userId };

    if (dto.status !== undefined) {
      where.status = dto.status;
    }

    const [data, total] = await this._orderRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { license: { licenseType: true }, moment: { photographerProfile: true } },
      skip: dto.skip,
      take: limit,
      where,
    });

    const sanitized = data.map((order) => this._withoutMomentPlate(order));

    return { data: sanitized, limit, offset, total };
  }

  /**
   * Returns an order copy whose nested moment never carries the full plate. The
   * library list does not need plate data, so we strip it for defense in depth
   * (public/owner surfaces must never receive the full plate — requirements §4.3).
   */
  private _withoutMomentPlate(order: OrderEntity): OrderEntity {
    if (!order.moment) {
      return order;
    }

    const safeMoment = Object.assign(
      Object.create(Object.getPrototypeOf(order.moment)),
      order.moment,
      { licensePlate: null },
    );

    return Object.assign(Object.create(Object.getPrototypeOf(order)), order, {
      moment: safeMoment,
    });
  }

  public async findOrderById(id: string, userId: string): Promise<OrderEntity> {
    const order = await this._orderRepository.findOne({
      relations: { license: { licenseType: true }, moment: { photographerProfile: true } },
      where: { deletedAt: IsNull(), id },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found.`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order.');
    }

    return this._withoutMomentPlate(order);
  }

  public async cancelOrder(id: string, userId: string): Promise<OrderEntity> {
    const order = await this.findOrderById(id, userId);

    if (order.status !== OrderStatusEnum.PENDING) {
      throw new BadRequestException('Only PENDING orders can be cancelled.');
    }

    await this._orderRepository.update(id, {
      cancelledAt: Math.floor(Date.now() / 1000),
      status: OrderStatusEnum.CANCELLED,
    });

    order.cancelledAt = Math.floor(Date.now() / 1000);
    order.status = OrderStatusEnum.CANCELLED;

    return order;
  }

  public async generateDownloadUrl(id: string, userId: string): Promise<IDownloadResult> {
    const order = await this.findOrderById(id, userId);

    if (order.status !== OrderStatusEnum.PAID) {
      throw new BadRequestException('Only PAID orders are eligible for download.');
    }

    if (!order.downloadToken) {
      throw new BadRequestException('Download token is not available for this order.');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const downloadUrl = order.moment?.imageUrl ?? null;

    if (!downloadUrl) {
      throw new NotFoundException('Original image is not available for download.');
    }

    return {
      downloadUrl,
      expiresAt,
      momentId: order.momentId,
      orderId: order.id,
    };
  }

  public async generateDownloadUrlByToken(downloadToken: string): Promise<IDownloadResult> {
    const order = await this._orderRepository.findOne({
      relations: { moment: true },
      where: { deletedAt: IsNull(), downloadToken },
    });

    if (!order) {
      throw new NotFoundException('Download token is invalid or expired.');
    }

    if (order.status !== OrderStatusEnum.PAID) {
      throw new BadRequestException('Order is not in a downloadable state.');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const downloadUrl = order.moment?.imageUrl ?? null;

    if (!downloadUrl) {
      throw new NotFoundException('Original image is not available for download.');
    }

    return {
      downloadUrl,
      expiresAt,
      momentId: order.momentId,
      orderId: order.id,
    };
  }

  public async processWebhook(payload: IMidtransWebhookPayload): Promise<void> {
    const isValid = this._midtransService.verifyWebhookSignature(
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
      payload.signature_key,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature.');
    }

    const order = await this._orderRepository.findOne({
      where: { deletedAt: IsNull(), id: payload.order_id },
    });

    if (!order) {
      return;
    }

    if (order.status === OrderStatusEnum.PAID) {
      return;
    }

    const newStatus = this._midtransService.mapTransactionStatus(
      payload.transaction_status,
      payload.fraud_status,
    );

    const updateData: { downloadToken?: string; paidAt?: number; status: OrderStatusEnum } = {
      status: newStatus,
    };

    if (newStatus === OrderStatusEnum.PAID) {
      updateData.downloadToken = randomUUID();
      updateData.paidAt = Math.floor(Date.now() / 1000);
    }

    await this._orderRepository.update(order.id, updateData);

    if (newStatus === OrderStatusEnum.PAID) {
      // Fire-and-forget: a receipt failure must never break the webhook.
      void this._sendReceiptForOrder(order.id);
    }
  }

  /**
   * @description Build and send the buyer receipt for a paid order. Reloads the
   * order with the moment/license relations needed for the email and never
   * throws — failures are logged inside the mail service.
   */
  private async _sendReceiptForOrder(orderId: string): Promise<void> {
    try {
      const order = await this._orderRepository.findOne({
        relations: { license: { licenseType: true }, moment: { photographerProfile: true } },
        where: { id: orderId },
      });

      if (!order) {
        return;
      }

      const recipient = order.billingInfo?.email;

      if (!recipient) {
        this._logger.warn(`[WARN] No billing email on order ${orderId}; skipping receipt.`);

        return;
      }

      await this._receiptMailService.sendReceipt(recipient, this._toReceiptData(order));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this._logger.error(`[ERROR] Could not prepare receipt for order ${orderId}: ${message}`);
    }
  }

  private _toReceiptData(order: OrderEntity): IOrderReceiptData {
    const buyerName = [order.billingInfo?.firstName, order.billingInfo?.lastName]
      .filter(Boolean)
      .join(' ');

    return {
      buyerName: buyerName || 'there',
      currency: order.currency,
      discount: Number(order.discountAmount),
      libraryUrl: `${this._config.webBaseUrl}/account/library`,
      licenseName: order.license?.licenseType?.name ?? 'Standard license',
      momentTitle: order.moment?.caption ?? 'Captura moment',
      orderId: order.id,
      paidAtUnix: order.paidAt,
      photographerName: order.moment?.photographerProfile?.artistName ?? 'Captura photographer',
      serviceFee: Number(order.serviceFee),
      subtotal: Number(order.subtotalAmount),
      tax: Number(order.taxAmount),
      total: Number(order.totalAmount),
    };
  }
}
