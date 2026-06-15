// Crypto
import { createHash, randomUUID, timingSafeEqual } from 'crypto';

// Entities
import type { OrderEntity } from '../entities/order.entity';

// Enums
import { OrderStatusEnum } from '../enums/order-status.enum';

// Interfaces
import type { IBillingInfo, IMidtransSnapTransaction } from '../interfaces/orders.interface';

// Midtrans
import { Snap } from 'midtrans-client';

// NestJS Libraries
import { Injectable, Logger } from '@nestjs/common';

// Services
import { AppConfigurationsService } from '../../../configurations/app/app-configuration.service';

@Injectable()
export class MidtransService {
  private readonly _logger = new Logger(MidtransService.name);
  private readonly _snap: Snap;

  constructor(private readonly _config: AppConfigurationsService) {
    this._snap = new Snap({
      clientKey: this._config.midtransClientKey,
      isProduction: this._config.midtransIsProduction,
      serverKey: this._config.midtransServerKey,
    });
  }

  public async createSnapTransaction(order: OrderEntity): Promise<IMidtransSnapTransaction> {
    const billing = order.billingInfo as IBillingInfo | null;

    const transaction = await this._snap.createTransaction({
      customer_details: {
        email: billing?.email,
        first_name: billing?.firstName,
        last_name: billing?.lastName,
        phone: billing?.phone,
      },
      expiry: {
        duration: this._config.paymentExpiryMinutes,
        unit: 'minute',
      },
      item_details: [
        {
          id: order.licenseId ?? randomUUID(),
          name: 'Moment License',
          price: Math.round(+order.subtotalAmount),
          quantity: 1,
        },
        {
          id: 'service-fee',
          name: 'Service Fee',
          price: Math.round(+order.serviceFee),
          quantity: 1,
        },
        {
          id: 'tax-ppn',
          name: 'PPN Tax',
          price: Math.round(+order.taxAmount),
          quantity: 1,
        },
      ],
      transaction_details: {
        gross_amount: Math.round(+order.totalAmount),
        order_id: order.id,
      },
    });

    return { redirect_url: transaction.redirect_url, token: transaction.token };
  }

  public verifyWebhookSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    incomingSignature: string,
  ): boolean {
    try {
      const expectedHash = createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${this._config.midtransServerKey}`)
        .digest('hex');

      const expected = Buffer.from(expectedHash, 'hex');
      const incoming = Buffer.from(incomingSignature, 'hex');
      return expected.length === incoming.length && timingSafeEqual(expected, incoming);
    } catch (err) {
      this._logger.warn(`Webhook signature verification failed: ${err}`);
      return false;
    }
  }

  public mapTransactionStatus(transactionStatus: string, fraudStatus?: string): OrderStatusEnum {
    if (transactionStatus === 'capture') {
      return fraudStatus === 'challenge' ? OrderStatusEnum.PENDING : OrderStatusEnum.PAID;
    }

    if (transactionStatus === 'settlement') return OrderStatusEnum.PAID;
    if (transactionStatus === 'deny' || transactionStatus === 'cancel')
      return OrderStatusEnum.FAILED;
    if (transactionStatus === 'expire') return OrderStatusEnum.EXPIRED;

    return OrderStatusEnum.PENDING;
  }
}
