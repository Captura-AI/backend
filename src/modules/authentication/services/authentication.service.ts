// Bcrypt
import * as bcrypt from 'bcrypt';

// Constants
import { BAD_REQUEST_MSG, SALT_OR_ROUND } from '../../../common/constants/common.constant';

// DTOs
import type { MagicLinkInitDto } from '../dtos/magic-link-init.dto';
import type { MagicLinkVerifyDto } from '../dtos/magic-link-verify.dto';
import type { PhoneInitDto } from '../dtos/phone-init.dto';
import type { PhoneVerifyDto } from '../dtos/phone-verify.dto';
import type { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { RegisterEmailDto } from '../dtos/register.dto';

// Entities
import { UsersEntity } from '../../users/entities/users.entity';

// Interfaces
import type { IAuthTokens } from '../interfaces/authentication.interface';

// IORedis
import type Redis from 'ioredis';

// NestJS Libraries
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Redis
import { REDIS_CLIENT } from '../../../database/redis/redis-provider.module';

// Services
import { JwtConfigService } from '../../../configurations/jwt/jwt-configuration.service';
import { MagicLinkService } from './magic-link.service';
import { OtpService } from './otp.service';
import { UsersService } from '../../users/services/users.service';

const MAGIC_LINK_BASE_URL_DEFAULT = 'http://localhost:3000/auth/magic-link/verify';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600;

@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly _redis: Redis,
    private readonly _jwtConfigService: JwtConfigService,
    private readonly _jwtService: JwtService,
    private readonly _magicLinkService: MagicLinkService,
    private readonly _otpService: OtpService,
    private readonly _usersService: UsersService,
  ) {}

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private _buildRefreshKey(userId: string): string {
    return `refresh:${userId}`;
  }

  private async _issueTokens(user: IRequestUser): Promise<IAuthTokens> {
    const payload = { email: user.email, sub: user.id, username: user.username };
    const accessToken = this._jwtService.sign(payload);

    const refreshPayload = { sub: user.id, type: 'refresh' };
    const refreshToken = this._jwtService.sign(refreshPayload, { expiresIn: '7d' });

    await this._redis.setex(
      this._buildRefreshKey(user.id),
      REFRESH_TOKEN_TTL_SECONDS,
      refreshToken,
    );

    return { accessToken, refreshToken };
  }

  // ─── Username / Password ───────────────────────────────────────────────────

  public async validateUser(username: string, pass: string): Promise<UsersEntity | null> {
    try {
      const user = await this._usersService.findOneByUsername(username);
      const isMatch = await bcrypt.compare(`${pass}`, user!.password!);

      if (!isMatch) {
        throw new BadRequestException('Bad Request', {
          cause: new Error(),
          description: 'Invalid password',
        });
      }

      return user;
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  public async login(user: IRequestUser): Promise<IAuthTokens> {
    return this._issueTokens(user);
  }

  public async register(payload: RegisterEmailDto): Promise<UsersEntity> {
    try {
      const { email, password, username } = payload;
      const emailExists = await this._usersService.findOneByEmail(email);

      if (emailExists) {
        throw new BadRequestException(`Bad Request`, {
          cause: new Error(),
          description: `Users with email ${email} already exists`,
        });
      }

      const passwordHashed = await bcrypt.hash(password, SALT_OR_ROUND);

      return await this._usersService.create({
        email,
        password: passwordHashed,
        username,
      });
    } catch (error: unknown) {
      const err = error as { response?: { message?: string; error?: string }; message?: string };
      throw new BadRequestException(err.response?.message ?? BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  // ─── Refresh Token ─────────────────────────────────────────────────────────

  public async refreshAccessToken(dto: RefreshTokenDto): Promise<IAuthTokens> {
    try {
      const decoded = this._jwtService.verify<{ sub: string; type: string }>(dto.refreshToken, {
        secret: this._jwtConfigService.jwtSecret,
      });

      if (decoded.type !== 'refresh') {
        throw new BadRequestException(BAD_REQUEST_MSG, {
          cause: new Error(),
          description: 'Invalid refresh token type.',
        });
      }

      const stored = await this._redis.get(this._buildRefreshKey(decoded.sub));

      if (!stored || stored !== dto.refreshToken) {
        throw new BadRequestException(BAD_REQUEST_MSG, {
          cause: new Error(),
          description: 'Refresh token has been revoked or does not exist.',
        });
      }

      const user = await this._usersService.findOneById(decoded.sub);
      const requestUser: IRequestUser = {
        email: user.email ?? '',
        id: user.id,
        username: user.username ?? '',
      };

      return this._issueTokens(requestUser);
    } catch (error: unknown) {
      const err = error as { response?: { error?: string }; message?: string };
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: err.response?.error ?? err.message,
      });
    }
  }

  // ─── Phone OTP ─────────────────────────────────────────────────────────────

  public async initPhoneAuth(dto: PhoneInitDto): Promise<void> {
    const countryCode = (dto.countryCode ?? '+62').replace('+', '');
    const normalized = dto.phoneNumber.startsWith('0')
      ? `${countryCode}${dto.phoneNumber.slice(1)}`
      : dto.phoneNumber;

    await this._otpService.generateAndSend(normalized);
  }

  public async verifyPhoneOtp(dto: PhoneVerifyDto): Promise<IAuthTokens> {
    const countryCode = (dto.countryCode ?? '+62').replace('+', '');
    const normalized = dto.phoneNumber.startsWith('0')
      ? `${countryCode}${dto.phoneNumber.slice(1)}`
      : dto.phoneNumber;

    const isValid = await this._otpService.verify(normalized, dto.otp);

    if (!isValid) {
      throw new BadRequestException(BAD_REQUEST_MSG, {
        cause: new Error(),
        description: 'Invalid or expired OTP.',
      });
    }

    let user = await this._usersService.findOneByPhoneNumber(normalized);

    user ??= await this._usersService.createPhoneUser({
      isPhoneVerified: true,
      phoneNumber: normalized,
      providers: ['phone'],
    });

    const requestUser: IRequestUser = {
      email: user.email ?? '',
      id: user.id,
      username: user.username ?? '',
    };

    return this._issueTokens(requestUser);
  }

  // ─── SSO (Google / Apple) ──────────────────────────────────────────────────

  public async loginWithSso(user: UsersEntity): Promise<IAuthTokens> {
    const requestUser: IRequestUser = {
      email: user.email ?? '',
      id: user.id,
      username: user.username ?? '',
    };

    return this._issueTokens(requestUser);
  }

  // ─── Magic Link ────────────────────────────────────────────────────────────

  public async initMagicLink(dto: MagicLinkInitDto): Promise<void> {
    const baseUrl = process.env.MAGIC_LINK_BASE_URL ?? MAGIC_LINK_BASE_URL_DEFAULT;
    await this._magicLinkService.generateAndSend(dto.email, baseUrl);
  }

  public async verifyMagicLink(dto: MagicLinkVerifyDto): Promise<IAuthTokens> {
    const email = await this._magicLinkService.verify(dto.token);

    let user = await this._usersService.findOneByEmail(email);

    if (!user) {
      user = await this._usersService.findOrCreateSsoUser({
        email,
        isEmailVerified: true,
        provider: 'google',
        providerId: email,
      });

      user.providers = ['magic-link'];
      user.isEmailVerified = true;
    }

    const requestUser: IRequestUser = {
      email: user.email ?? '',
      id: user.id,
      username: user.username ?? '',
    };

    return this._issueTokens(requestUser);
  }
}
