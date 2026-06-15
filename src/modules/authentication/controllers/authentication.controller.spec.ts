// Controllers
import { AuthenticationController } from './authentication.controller';

// DTOs
import { LoginUsernameDto } from '../dtos/login.dto';

// NestJS Libraries
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Modules
import { JwtConfigModule } from '../../../configurations/jwt/jwt-configuration.module';

// Redis
import { REDIS_CLIENT } from '../../../database/redis/redis-provider.module';

// Services
import { AuthenticationService } from '../services/authentication.service';
import { AppleConfigService } from '../../../configurations/apple/apple-configuration.service';
import { GoogleConfigService } from '../../../configurations/google/google-configuration.service';
import { JwtConfigService } from '../../../configurations/jwt/jwt-configuration.service';
import { MagicLinkService } from '../services/magic-link.service';
import { OtpService } from '../services/otp.service';
import { UsersService } from '../../users/services/users.service';

const mockRedis = {
  del: jest.fn(),
  get: jest.fn(),
  setex: jest.fn().mockResolvedValue('OK'),
};

const mockUser = {
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
};

describe('AuthenticationController', () => {
  let controller: AuthenticationController;

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
          provide: AppleConfigService,
          useValue: {
            appleCallbackUrl: '',
            appleClientId: '',
            appleKeyId: '',
            applePrivateKey: '',
            appleTeamId: '',
          },
        },
        {
          provide: GoogleConfigService,
          useValue: {
            googleCallbackUrl: 'http://localhost:1337/api/authentication/google/callback',
            googleClientId: 'google-client-id',
            googleClientSecret: 'google-client-secret',
          },
        },
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
            createPhoneUser: jest.fn().mockResolvedValue(mockUser),
            findOneByEmail: jest.fn().mockResolvedValue(mockUser),
            findOneById: jest.fn().mockResolvedValue(mockUser),
            findOneByPhoneNumber: jest.fn().mockResolvedValue(null),
            findOneByUsername: jest.fn().mockResolvedValue(mockUser),
            findOrCreateSsoUser: jest.fn().mockResolvedValue(mockUser),
          },
        },
      ],
      controllers: [AuthenticationController],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    jest.clearAllMocks();
    mockRedis.setex.mockResolvedValue('OK');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('[GET] /authentication/oauth/providers', () => {
    it('returns OAuth provider availability without exposing secrets', () => {
      const response = controller.getOAuthProviders();

      expect(response.message).toBe('OAuth provider availability retrieved successfully');
      expect(response.result.google.available).toBe(true);
      expect(response.result.apple.available).toBe(false);
      expect(JSON.stringify(response)).not.toContain('google-client-secret');
    });
  });

  describe('[POST] /authentication/login', () => {
    it('should return a accessToken', async () => {
      const body = new LoginUsernameDto();
      body.username = 'email@test.com';
      body.password = 'secret';

      const request = {
        user: {
          id: '1',
          username: 'user name',
          email: 'test@test.com',
        },
      };

      const response = await controller.login(body, request as unknown as ICustomRequestHeaders);

      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('result');
      expect(response.message).toBe('User logged in successfully');
      expect(response.result).toHaveProperty('accessToken');
    });
  });
});
