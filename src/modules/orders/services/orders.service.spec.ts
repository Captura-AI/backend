// DTOs
import { CheckoutRequestDto } from '../dtos/checkout-request.dto';
import { ListOrdersDto } from '../dtos/list-orders.dto';

// Entities
import { MomentEntity } from '../../moments/entities/moments.entity';
import { MomentLicenseEntity } from '../../moments/entities/moment-license.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';

// Enums
import { OrderStatusEnum } from '../enums/order-status.enum';
import { PaymentGatewayEnum } from '../enums/payment-gateway.enum';
import { PaymentMethodEnum } from '../enums/payment-method.enum';

// NestJS Libraries
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Services
import { AppConfigurationsService } from '../../../configurations/app/app-configuration.service';
import { MidtransService } from './midtrans.service';
import { OrderReceiptMailService } from './order-receipt-mail.service';
import { OrdersService } from './orders.service';

const mockMoment = (): MomentEntity => {
  const m = new MomentEntity();
  m.id = 'moment-uuid-1';
  m.deletedAt = null;
  return m;
};

const mockLicense = (): MomentLicenseEntity => {
  const l = new MomentLicenseEntity();
  l.id = 'license-uuid-1';
  l.momentId = 'moment-uuid-1';
  l.price = 500000;
  l.currency = 'IDR';
  l.isActive = true;
  l.deletedAt = null;
  return l;
};

const mockOrder = (): OrderEntity => {
  const o = new OrderEntity();
  o.id = 'order-uuid-1';
  o.userId = 'user-uuid-1';
  o.momentId = 'moment-uuid-1';
  o.licenseId = 'license-uuid-1';
  o.status = OrderStatusEnum.PENDING;
  o.subtotalAmount = 500000;
  o.serviceFee = 25000;
  o.taxAmount = 57750;
  o.discountAmount = 0;
  o.totalAmount = 582750;
  o.currency = 'IDR';
  o.paymentMethod = PaymentMethodEnum.QRIS;
  o.paymentGateway = PaymentGatewayEnum.MIDTRANS;
  o.paymentToken = 'snap-token-123';
  o.paymentExpiredAt = Math.floor(Date.now() / 1000) + 3600;
  o.deletedAt = null;
  o.billingInfo = { email: 'user@test.com', firstName: 'Budi', lastName: 'S' };
  return o;
};

const mockCheckoutDto = (): CheckoutRequestDto => {
  const dto = new CheckoutRequestDto();
  dto.momentId = 'moment-uuid-1';
  dto.licenseId = 'license-uuid-1';
  dto.paymentMethod = PaymentMethodEnum.QRIS;
  dto.billingInfo = { email: 'user@test.com', firstName: 'Budi', lastName: 'S' };
  return dto;
};

describe('OrdersService', () => {
  let service: OrdersService;

  let mockOrderRepo: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  let mockOrderItemRepo: {
    save: jest.Mock;
  };

  let mockMomentRepo: {
    findOne: jest.Mock;
  };

  let mockLicenseRepo: {
    findOne: jest.Mock;
  };

  let mockMidtransService: {
    createSnapTransaction: jest.Mock;
    mapTransactionStatus: jest.Mock;
    verifyWebhookSignature: jest.Mock;
  };

  let mockConfigService: {
    midtransIsProduction: boolean;
    paymentExpiryMinutes: number;
    serviceFeeRate: number;
    taxRate: number;
    webBaseUrl: string;
  };

  let mockReceiptMailService: { sendReceipt: jest.Mock };

  beforeEach(async () => {
    mockOrderRepo = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockOrderItemRepo = { save: jest.fn() };
    mockMomentRepo = { findOne: jest.fn() };
    mockLicenseRepo = { findOne: jest.fn() };

    mockMidtransService = {
      createSnapTransaction: jest.fn(),
      mapTransactionStatus: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    };

    mockConfigService = {
      midtransIsProduction: false,
      paymentExpiryMinutes: 60,
      serviceFeeRate: 0.05,
      taxRate: 0.11,
      webBaseUrl: 'http://localhost:3000',
    };

    mockReceiptMailService = { sendReceipt: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(OrderEntity), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItemEntity), useValue: mockOrderItemRepo },
        { provide: getRepositoryToken(MomentEntity), useValue: mockMomentRepo },
        { provide: getRepositoryToken(MomentLicenseEntity), useValue: mockLicenseRepo },
        { provide: MidtransService, useValue: mockMidtransService },
        { provide: AppConfigurationsService, useValue: mockConfigService },
        { provide: OrderReceiptMailService, useValue: mockReceiptMailService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout()', () => {
    it('creates order and returns snap token', async () => {
      const order = mockOrder();
      const dto = mockCheckoutDto();

      mockMomentRepo.findOne.mockResolvedValue(mockMoment());
      mockLicenseRepo.findOne.mockResolvedValue(mockLicense());
      mockOrderRepo.save.mockResolvedValue(order);
      mockOrderItemRepo.save.mockResolvedValue({});
      mockMidtransService.createSnapTransaction.mockResolvedValue({
        redirect_url: 'https://app.midtrans.com/snap/v2/vtweb/snap-token-123',
        token: 'snap-token-123',
      });
      mockOrderRepo.update.mockResolvedValue(undefined);

      const result = await service.checkout('user-uuid-1', dto);

      expect(result.snapToken).toBe('snap-token-123');
      expect(result.order).toBeDefined();
      expect(mockOrderRepo.save).toHaveBeenCalled();
      expect(mockOrderItemRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when moment not found', async () => {
      mockMomentRepo.findOne.mockResolvedValue(null);

      await expect(service.checkout('user-uuid-1', mockCheckoutDto())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when license not found for moment', async () => {
      mockMomentRepo.findOne.mockResolvedValue(mockMoment());
      mockLicenseRepo.findOne.mockResolvedValue(null);

      await expect(service.checkout('user-uuid-1', mockCheckoutDto())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('calculates pricing correctly', async () => {
      const dto = mockCheckoutDto();
      const license = mockLicense();
      license.price = 500000;

      mockMomentRepo.findOne.mockResolvedValue(mockMoment());
      mockLicenseRepo.findOne.mockResolvedValue(license);
      mockOrderRepo.save.mockImplementation(async (o: OrderEntity) => {
        o.id = 'order-uuid-1';
        return o;
      });
      mockOrderItemRepo.save.mockResolvedValue({});
      mockMidtransService.createSnapTransaction.mockResolvedValue({
        redirect_url: 'https://redirect.url',
        token: 'snap-token',
      });
      mockOrderRepo.update.mockResolvedValue(undefined);

      const result = await service.checkout('user-uuid-1', dto);

      expect(result.order.subtotalAmount).toBe(500000);
      expect(result.order.serviceFee).toBe(Math.floor(500000 * 0.05));
      expect(result.order.taxAmount).toBe(Math.floor((500000 + Math.floor(500000 * 0.05)) * 0.11));
      expect(result.order.discountAmount).toBe(0);
      expect(result.order.totalAmount).toBe(
        500000 +
          Math.floor(500000 * 0.05) +
          Math.floor((500000 + Math.floor(500000 * 0.05)) * 0.11),
      );
    });

    it('throws BadRequestException when midtrans call fails', async () => {
      mockMomentRepo.findOne.mockResolvedValue(mockMoment());
      mockLicenseRepo.findOne.mockResolvedValue(mockLicense());
      mockOrderRepo.save.mockResolvedValue(mockOrder());
      mockOrderItemRepo.save.mockResolvedValue({});
      mockMidtransService.createSnapTransaction.mockRejectedValue(new Error('Midtrans API error'));

      await expect(service.checkout('user-uuid-1', mockCheckoutDto())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findMyOrders()', () => {
    it('returns paginated list of user orders', async () => {
      const orders = [mockOrder()];
      mockOrderRepo.findAndCount.mockResolvedValue([orders, 1]);

      const dto = new ListOrdersDto();
      dto.limit = 10;
      dto.offset = 1;

      const result = await service.findMyOrders('user-uuid-1', dto);

      expect(result.data).toEqual(orders);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(mockOrderRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-uuid-1' }),
        }),
      );
    });

    it('filters by status when provided', async () => {
      mockOrderRepo.findAndCount.mockResolvedValue([[], 0]);

      const dto = new ListOrdersDto();
      dto.status = OrderStatusEnum.PAID;

      await service.findMyOrders('user-uuid-1', dto);

      expect(mockOrderRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatusEnum.PAID }),
        }),
      );
    });
  });

  describe('findOrderById()', () => {
    it('returns order for the owner', async () => {
      const order = mockOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);

      const result = await service.findOrderById('order-uuid-1', 'user-uuid-1');

      expect(result).toEqual(order);
    });

    it('throws NotFoundException when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.findOrderById('non-existent', 'user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when different user tries to access', async () => {
      const order = mockOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.findOrderById('order-uuid-1', 'other-user-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancelOrder()', () => {
    it('cancels a PENDING order', async () => {
      const order = mockOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.update.mockResolvedValue(undefined);

      const result = await service.cancelOrder('order-uuid-1', 'user-uuid-1');

      expect(result.status).toBe(OrderStatusEnum.CANCELLED);
      expect(mockOrderRepo.update).toHaveBeenCalledWith(
        'order-uuid-1',
        expect.objectContaining({ status: OrderStatusEnum.CANCELLED }),
      );
    });

    it('throws BadRequestException when order is not PENDING', async () => {
      const order = mockOrder();
      order.status = OrderStatusEnum.PAID;
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.cancelOrder('order-uuid-1', 'user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processWebhook()', () => {
    const basePayload = {
      fraud_status: 'accept',
      gross_amount: '582750.00',
      order_id: 'order-uuid-1',
      payment_type: 'qris',
      signature_key: 'valid-signature',
      status_code: '200',
      transaction_id: 'tx-uuid-1',
      transaction_status: 'settlement',
    };

    it('updates order to PAID and generates downloadToken on settlement', async () => {
      const order = mockOrder();
      mockMidtransService.verifyWebhookSignature.mockReturnValue(true);
      mockMidtransService.mapTransactionStatus.mockReturnValue(OrderStatusEnum.PAID);
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.update.mockResolvedValue(undefined);

      await service.processWebhook(basePayload);

      expect(mockOrderRepo.update).toHaveBeenCalledWith(
        'order-uuid-1',
        expect.objectContaining({
          downloadToken: expect.any(String),
          paidAt: expect.any(Number),
          status: OrderStatusEnum.PAID,
        }),
      );
    });

    it('updates order to EXPIRED on expire', async () => {
      const order = mockOrder();
      mockMidtransService.verifyWebhookSignature.mockReturnValue(true);
      mockMidtransService.mapTransactionStatus.mockReturnValue(OrderStatusEnum.EXPIRED);
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockOrderRepo.update.mockResolvedValue(undefined);

      await service.processWebhook({ ...basePayload, transaction_status: 'expire' });

      expect(mockOrderRepo.update).toHaveBeenCalledWith(
        'order-uuid-1',
        expect.objectContaining({ status: OrderStatusEnum.EXPIRED }),
      );
    });

    it('throws BadRequestException on invalid signature', async () => {
      mockMidtransService.verifyWebhookSignature.mockReturnValue(false);

      await expect(service.processWebhook(basePayload)).rejects.toThrow(BadRequestException);
    });

    it('skips update if order is already PAID', async () => {
      const order = mockOrder();
      order.status = OrderStatusEnum.PAID;
      mockMidtransService.verifyWebhookSignature.mockReturnValue(true);
      mockOrderRepo.findOne.mockResolvedValue(order);

      await service.processWebhook(basePayload);

      expect(mockOrderRepo.update).not.toHaveBeenCalled();
    });

    it('skips update if order not found', async () => {
      mockMidtransService.verifyWebhookSignature.mockReturnValue(true);
      mockOrderRepo.findOne.mockResolvedValue(null);

      await service.processWebhook(basePayload);

      expect(mockOrderRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('generateDownloadUrl()', () => {
    it('returns download URL for a PAID order', async () => {
      const order = mockOrder();
      order.status = OrderStatusEnum.PAID;
      order.downloadToken = 'dl-token-uuid';
      order.moment = mockMoment() as any;
      (order.moment as any).imageUrl = 'https://storage.example.com/photo.jpg';

      mockOrderRepo.findOne.mockResolvedValue(order);

      const result = await service.generateDownloadUrl('order-uuid-1', 'user-uuid-1');

      expect(result.downloadUrl).toBe('https://storage.example.com/photo.jpg');
      expect(result.orderId).toBe('order-uuid-1');
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('throws BadRequestException when order is not PAID', async () => {
      const order = mockOrder();
      order.status = OrderStatusEnum.PENDING;
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.generateDownloadUrl('order-uuid-1', 'user-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.generateDownloadUrl('non-existent', 'user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateDownloadUrlByToken()', () => {
    it('returns download URL for a valid token', async () => {
      const order = mockOrder();
      order.status = OrderStatusEnum.PAID;
      order.downloadToken = 'dl-token-uuid';
      order.moment = mockMoment() as any;
      (order.moment as any).imageUrl = 'https://storage.example.com/photo.jpg';

      mockOrderRepo.findOne.mockResolvedValue(order);

      const result = await service.generateDownloadUrlByToken('dl-token-uuid');

      expect(result.downloadUrl).toBe('https://storage.example.com/photo.jpg');
      expect(result.orderId).toBe('order-uuid-1');
    });

    it('throws NotFoundException for unknown token', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.generateDownloadUrlByToken('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when order is not PAID', async () => {
      const order = mockOrder();
      order.status = OrderStatusEnum.CANCELLED;
      order.downloadToken = 'dl-token-uuid';
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.generateDownloadUrlByToken('dl-token-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
