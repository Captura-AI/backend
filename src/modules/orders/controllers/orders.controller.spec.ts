// DTOs
import { CheckoutRequestDto } from '../dtos/checkout-request.dto';
import { ListOrdersDto } from '../dtos/list-orders.dto';

// Entities
import { OrderEntity } from '../entities/order.entity';

// Enums
import { OrderStatusEnum } from '../enums/order-status.enum';
import { PaymentGatewayEnum } from '../enums/payment-gateway.enum';
import { PaymentMethodEnum } from '../enums/payment-method.enum';
import { UserRoleEnum } from '../../users/enums/user-role.enum';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Controllers
import { OrdersController } from './orders.controller';
import { WebhooksController } from './webhooks.controller';

// Services
import { OrdersService } from '../services/orders.service';

const mockOrder = (): OrderEntity => {
  const o = new OrderEntity();
  o.id = 'order-uuid-1';
  o.userId = 'user-uuid-1';
  o.status = OrderStatusEnum.PENDING;
  o.totalAmount = 582750;
  o.paymentGateway = PaymentGatewayEnum.MIDTRANS;
  o.paymentToken = 'snap-token-123';
  return o;
};

const mockUser = (): IRequestUser => ({
  email: 'user@test.com',
  id: 'user-uuid-1',
  role: UserRoleEnum.USER as TUserRole,
  username: 'user',
});

describe('OrdersController', () => {
  let controller: OrdersController;
  let webhooksController: WebhooksController;
  let mockOrdersService: {
    cancelOrder: jest.Mock;
    checkout: jest.Mock;
    findMyOrders: jest.Mock;
    findOrderById: jest.Mock;
    processWebhook: jest.Mock;
  };

  beforeEach(async () => {
    mockOrdersService = {
      cancelOrder: jest.fn(),
      checkout: jest.fn(),
      findMyOrders: jest.fn(),
      findOrderById: jest.fn(),
      processWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController, WebhooksController],
      providers: [{ provide: OrdersService, useValue: mockOrdersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    webhooksController = module.get<WebhooksController>(WebhooksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(webhooksController).toBeDefined();
  });

  describe('checkout()', () => {
    it('calls service.checkout and returns result', async () => {
      const order = mockOrder();
      const user = mockUser();
      const dto = new CheckoutRequestDto();
      dto.momentId = 'moment-uuid-1';
      dto.licenseId = 'license-uuid-1';
      dto.paymentMethod = PaymentMethodEnum.QRIS;
      dto.billingInfo = { email: 'user@test.com', firstName: 'Budi', lastName: 'S' };

      const checkoutResult = {
        order,
        paymentExpiredAt: Math.floor(Date.now() / 1000) + 3600,
        redirectUrl: 'https://app.midtrans.com',
        snapToken: 'snap-token-123',
      };

      mockOrdersService.checkout.mockResolvedValue(checkoutResult);

      const response = await controller.checkout(user, dto);

      expect(mockOrdersService.checkout).toHaveBeenCalledWith(user.id, dto);
      expect(response).toEqual({
        message: 'Checkout initiated successfully',
        result: checkoutResult,
      });
    });
  });

  describe('findMyOrders()', () => {
    it('calls service.findMyOrders and returns result', async () => {
      const user = mockUser();
      const query = new ListOrdersDto();
      const paginatedResult = { data: [mockOrder()], limit: 10, offset: 1, total: 1 };

      mockOrdersService.findMyOrders.mockResolvedValue(paginatedResult);

      const response = await controller.findMyOrders(user, query);

      expect(mockOrdersService.findMyOrders).toHaveBeenCalledWith(user.id, query);
      expect(response).toEqual({
        message: 'Orders retrieved successfully',
        result: paginatedResult,
      });
    });
  });

  describe('findById()', () => {
    it('calls service.findOrderById and returns result', async () => {
      const user = mockUser();
      const order = mockOrder();

      mockOrdersService.findOrderById.mockResolvedValue(order);

      const response = await controller.findById(user, { id: 'order-uuid-1' });

      expect(mockOrdersService.findOrderById).toHaveBeenCalledWith('order-uuid-1', user.id);
      expect(response).toEqual({
        message: 'Order retrieved successfully',
        result: order,
      });
    });
  });

  describe('cancel()', () => {
    it('calls service.cancelOrder and returns result', async () => {
      const user = mockUser();
      const order = mockOrder();
      order.status = OrderStatusEnum.CANCELLED;

      mockOrdersService.cancelOrder.mockResolvedValue(order);

      const response = await controller.cancel(user, { id: 'order-uuid-1' });

      expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith('order-uuid-1', user.id);
      expect(response).toEqual({
        message: 'Order cancelled successfully',
        result: order,
      });
    });
  });

  describe('WebhooksController - handleMidtrans()', () => {
    it('calls service.processWebhook and returns success message', async () => {
      const payload = {
        fraud_status: 'accept',
        gross_amount: '582750.00',
        order_id: 'order-uuid-1',
        payment_type: 'qris',
        signature_key: 'valid-sig',
        status_code: '200',
        transaction_id: 'tx-uuid-1',
        transaction_status: 'settlement',
      };

      mockOrdersService.processWebhook.mockResolvedValue(undefined);

      const response = await webhooksController.handleMidtrans(payload);

      expect(mockOrdersService.processWebhook).toHaveBeenCalledWith(payload);
      expect(response).toEqual({ message: 'Webhook processed successfully' });
    });
  });
});
