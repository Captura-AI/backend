// Interfaces
import { OTP_SENDER } from '../interfaces/otp-sender.interface';

// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// Redis
import { REDIS_CLIENT } from '../../../database/redis/redis-provider.module';

// Services
import { OtpService } from './otp.service';

const mockRedis = {
  del: jest.fn(),
  expire: jest.fn(),
  get: jest.fn(),
  incr: jest.fn(),
  setex: jest.fn(),
};

const mockOtpSender = {
  send: jest.fn(),
};

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: OTP_SENDER, useValue: mockOtpSender },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAndSend', () => {
    it('should generate OTP, store in Redis, and send via OtpSender', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);
      mockRedis.setex.mockResolvedValue('OK');
      mockOtpSender.send.mockResolvedValue(undefined);

      await service.generateAndSend('628123456789');

      expect(mockRedis.incr).toHaveBeenCalledWith('otp:attempts:628123456789');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'otp:phone:628123456789',
        300,
        expect.stringMatching(/^\d{6}$/),
      );
      expect(mockOtpSender.send).toHaveBeenCalledWith(
        '628123456789',
        expect.stringContaining('OTP'),
      );
    });

    it('should throw BadRequestException when max attempts exceeded', async () => {
      mockRedis.incr.mockResolvedValue(6);

      await expect(service.generateAndSend('628123456789')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verify', () => {
    it('should return true and delete keys when OTP is correct', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockRedis.del.mockResolvedValue(1);

      const result = await service.verify('628123456789', '123456');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('otp:phone:628123456789');
    });

    it('should return false when OTP does not match', async () => {
      mockRedis.get.mockResolvedValue('654321');

      const result = await service.verify('628123456789', '123456');

      expect(result).toBe(false);
    });

    it('should return false when OTP has expired (null from Redis)', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.verify('628123456789', '123456');

      expect(result).toBe(false);
    });
  });
});
