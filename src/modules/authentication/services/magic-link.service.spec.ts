// NestJS Libraries
import type { TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// Redis
import { REDIS_CLIENT } from '../../../database/redis/redis-provider.module';

// Services
import { MagicLinkService } from './magic-link.service';
import { MailSenderService } from './mail-sender.service';

const mockRedis = {
  del: jest.fn(),
  get: jest.fn(),
  setex: jest.fn(),
};

const mockMailSender = {
  sendMagicLink: jest.fn(),
};

describe('MagicLinkService', () => {
  let service: MagicLinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MagicLinkService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: MailSenderService, useValue: mockMailSender },
      ],
    }).compile();

    service = module.get<MagicLinkService>(MagicLinkService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAndSend', () => {
    it('should store token in Redis and send email', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      mockMailSender.sendMagicLink.mockResolvedValue(undefined);

      await service.generateAndSend('user@example.com', 'http://localhost:3000/verify');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^magic:/),
        900,
        'user@example.com',
      );
      expect(mockMailSender.sendMagicLink).toHaveBeenCalledWith(
        'user@example.com',
        expect.stringContaining('http://localhost:3000/verify?token='),
      );
    });
  });

  describe('verify', () => {
    it('should return email and delete token when valid', async () => {
      mockRedis.get.mockResolvedValue('user@example.com');
      mockRedis.del.mockResolvedValue(1);

      const email = await service.verify('valid-token');

      expect(email).toBe('user@example.com');
      expect(mockRedis.del).toHaveBeenCalledWith('magic:valid-token');
    });

    it('should throw BadRequestException when token is invalid or expired', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verify('expired-token')).rejects.toThrow(BadRequestException);
    });
  });
});
