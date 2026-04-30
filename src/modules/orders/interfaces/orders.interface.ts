// Entities
import type { OrderEntity } from '../entities/order.entity';

// Enums
import type { OrderStatusEnum } from '../enums/order-status.enum';

export interface IBillingInfo {
  country?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface IOrdersResult {
  data: OrderEntity[];
  limit: number;
  offset: number;
  total: number;
}

export interface ICheckoutResult {
  order: OrderEntity;
  paymentExpiredAt: number;
  redirectUrl: string;
  snapToken: string;
}

export interface IMidtransWebhookPayload {
  fraud_status?: string;
  gross_amount: string;
  order_id: string;
  payment_type: string;
  signature_key: string;
  status_code: string;
  transaction_id: string;
  transaction_status: string;
}

export interface IMidtransSnapTransaction {
  redirect_url: string;
  token: string;
}

export interface IOrderItem {
  currency: string;
  licenseId: string | null;
  momentId: string | null;
  orderId: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
}

export type IOrderStatusMap = Record<string, OrderStatusEnum>;
