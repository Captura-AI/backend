// Bcrypt
import * as bcrypt from 'bcrypt';

// DTOs
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import type { UsersEntity } from '../../users/entities/users.entity';

// Modules
import { JwtConfigModule } from '../../../configurations/jwt/jwt-configuration.module';

// NestJS Libraries
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Redis
import { REDIS_CLIENT } from '../../../database/redis/redis-provider.module';

// Services
import { AuthenticationService } from './authentication.service';
import { JwtConfigService } from '../../../configurations/jwt/jwt-configuration.service';
import { MagicLinkService } from './magic-link.service';
import { OtpService } from './otp.service';
import { UsersService } from '../../users/services/users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const expectedValue = {
  avatar: null,
  createdAt: 123213000,
  createdBy: 'admin',
  createdById: '1',
  deletedAt: null,
  deletedBy: 'admin',
  deletedById: '1',
  email: 'email@test.com',
  googleId: null,
  id: '1',
  isEmailVerified: false,
  isPhoneVerified: false,
  name: null,
  password: 'hashed-password',
  phoneNumber: null,
  providers: [],
  updatedAt: 123213000,
  updatedBy: 'admin',
  updatedById: '1',
  username: 'username',
} as unknown as UsersEntity;

const mockRedis = {
  get: jest.fn(),
  setex: jest.fn().mockResolvedValue('OK'),
};

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let userService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtConfigModule,
        PassportModule,
        JwtModule.register({
          secretOrPrivateKey: 'secret',
          signOptions: {
            expiresIn: 3600,
          },
        }),
      ],
      providers: [
        AuthenticationService,
        JwtConfigService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        {
          provide: MagicLinkService,
          useValue: {
            generateAndSend: jest.fn().mockResolvedValue(undefined),
            verify: jest.fn().mockResolvedValue('user@example.com'),
          },
        },
        {
          provide: OtpService,
          useValue: {
            generateAndSend: jest.fn().mockResolvedValue(undefined),
            verify: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: UsersService,
          useValue: {
            create: jest
              .fn()
              .mockImplementation((user: UsersService) => Promise.resolve({ id: '1', ...user })),
            createPhoneUser: jest.fn().mockResolvedValue(expectedValue),
            findOneByEmail: jest.fn().mockResolvedValue(expectedValue),
            findOneById: jest.fn().mockResolvedValue(expectedValue),
            findOneByPhoneNumber: jest.fn().mockResolvedValue(null),
            findOneByUsername: jest.fn().mockResolvedValue(expectedValue),
            findOrCreateSsoUser: jest.fn().mockResolvedValue(expectedValue),
          },
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
    service = module.get<AuthenticationService>(AuthenticationService);
    jest.clearAllMocks();
    mockRedis.setex.mockResolvedValue('OK');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return bad request invalid credentials when password invalid', async () => {
      jest.spyOn(userService, 'findOneByUsername').mockResolvedValue(expectedValue);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      try {
        await service.validateUser('username', 'wrong-password');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should return a user when credentials are valid', async () => {
      jest.spyOn(userService, 'findOneByUsername').mockResolvedValue(expectedValue);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('username', 'correct-password');
      expect(result).toHaveProperty('id');
    });
  });

  describe('login', () => {
    it('should return accessToken and refreshToken', async () => {
      const request = { email: 'test@test.com', id: '1', username: 'user name' };

      const result = await service.login(request);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('register', () => {
    it('should throw when email already exists', async () => {
      jest.spyOn(userService, 'findOneByEmail').mockResolvedValue(expectedValue);

      const body = new RegisterEmailDto();
      body.email = 'email@test.com';
      body.password = 'secret';
      body.username = 'user name';

      await expect(service.register(body)).rejects.toThrow();
    });
  });

  describe('verifyPhoneOtp', () => {
    it('should return tokens after successful OTP verification', async () => {
      const result = await service.verifyPhoneOtp({
        otp: '123456',
        phoneNumber: '08123456789',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });
});
